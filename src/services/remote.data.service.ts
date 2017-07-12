/**
 * A centralized place for data
 *
 */
import {Injectable} from '@angular/core';
import {Platform} from "ionic-angular";
import {Network} from '@ionic-native/network';

/* Services */
import {OfflineCapableRestService} from './offline.capable.rest.service';
import {UserService} from './user.service';

/* Data Models */
import {CrmDataModel} from '../models/crm.data.model';
import {Checkpoint} from '../models/Checkpoint';
import {Checkin} from '../models/Checkin';

/* Data Providers */
import {CheckpointProvider} from "../providers/checkpoint.provider";
import {CheckinProvider} from "../providers/checkin.provider";

/* Utils */
import _ from "lodash";
import * as moment from 'moment';
import {Promise} from '../../node_modules/bluebird'
/*import md5 from '../../node_modules/blueimp-md5';*/

@Injectable()
export class RemoteDataService
{
  private last_in_out_operation: Checkin;
  private last_operation_type: string = Checkpoint.TYPE_OUT;
  private last_operation_date: string;

  private CURRENT_SESSION_CHECKINS: any;


  constructor(private offlineCapableRestService: OfflineCapableRestService
    , private userService: UserService
    , private network: Network
    , private platform: Platform
    , private checkpointProvider: CheckpointProvider
    , private checkinProvider: CheckinProvider)
  {
  }

  //-------------------------------------------------------------------------------------------------------REST API DATA
  /**
   *
   * @param {string} module_name
   * @param {string|boolean} id
   * @param {object} [parameters]
   * @returns {Promise<any>}
   */
  private setEntry(module_name: string, id: string | boolean, parameters = {}): Promise<any>
  {
    let self = this;
    return new Promise(function (resolve, reject)
    {
      self.offlineCapableRestService.setEntry(module_name, id, parameters)
        .then((res) =>
        {
          //do something with res
          resolve(res);
        })
        .catch((e) =>
        {
          reject(e);
        });
    });
  }

  /**
   *
   * @param {string} module_name
   * @param {object} [parameters]
   * @returns {Promise<any>}
   */
  private getEntryList(module_name: string, parameters = {}): Promise<any>
  {
    let self = this;
    return new Promise(function (resolve, reject)
    {
      self.offlineCapableRestService.getEntryList(module_name, parameters)
        .then((res) =>
        {
          //do something with res
          resolve(res);
        })
        .catch((e) =>
        {
          reject(e);
        });
    });
  }


  //----------------------------------------------------------------------------------------------------------CHECKPOINT


  //-------------------------------------------------------------------------------------------------------------CHECKIN


  /**
   * Return checkins since last "IN" in chronologically reversed order - this is for home display
   *
   * @returns {any[]}
   */
  public getCurrentSessionCheckins(): any
  {
    return this.CURRENT_SESSION_CHECKINS;
  }

  /**
   * Return checkins since last "IN" in chronologically reversed order - this is for home display
   *
   * @returns {Promise<any>}
   */
  public updateCurrentSessionCheckins(): Promise<any>
  {
    let self = this;
    return new Promise(function (resolve, reject)
    {
      if (_.isUndefined(self.last_in_out_operation) || _.isNull(self.last_in_out_operation))
      {
        resolve();
      }

      let fromDate = self.last_in_out_operation.checkin_date;
      //console.log("Updating CURRENT_SESSION_CHECKINS (from date: "+fromDate+")...");

      let options = {
        selector: {
          checkin_date: {$gte: fromDate}
        },
        sort: [{checkin_date: 'desc'}]
      };
      self.checkinProvider.findDocuments(options).then((res) =>
      {
        if (_.size(res.docs))
        {
          self.CURRENT_SESSION_CHECKINS = [];
          _.each(res.docs, function (doc)
          {
            self.CURRENT_SESSION_CHECKINS.push(new Checkin(doc));
          });
        }
        //console.log("CSCI: ", self.CURRENT_SESSION_CHECKINS);
        resolve();
      });
    });
  }

  /**
   * Register a new CHECKIN for current user at current time by matching the code passed of the checkpoints
   *
   * @param {string} code
   * @returns {Promise<string>}
   */
  public storeNewCheckin(code: string): Promise<Checkin>
  {
    let self = this;
    let newCheckin: Checkin;

    return new Promise(function (resolve, reject)
    {
      self.checkpointProvider.getCheckpoint({selector: {code: code}}).then((relativeCheckpoint) =>
      {
        let checkin = new Checkin({
          name: relativeCheckpoint.name,
          duration: 0,
          description: '',
          checkin_date: moment().format(CrmDataModel.CRM_DATE_FORMAT), /*@todo!!! SERVER TIME !!!*/
          user_id_c: self.userService.getUserData("id"),
          assigned_user_id: self.userService.getUserData("id"),
          checkin_user: self.userService.getUserData("full_name"),
          mkt_checkpoint_id_c: relativeCheckpoint.id,
          type: relativeCheckpoint.type,
          sync_state: CrmDataModel.SYNC_STATE__NEW
        });
        return self.checkinProvider.storeCheckin(checkin);
      }).then((checkinId) =>
      {
        console.log("New Checkin stored with id: ", checkinId);
        return self.checkinProvider.getCheckinById(checkinId);
      }).then((checkin) =>
      {
        newCheckin = checkin;
        return self.updateDurationOfPreviousCheckin(newCheckin);
      }).then(() =>
      {
        return self.findLastInOutOperation();
      }).then(() =>
      {
        return self.updateCurrentSessionCheckins();
      }).then(() =>
      {

        resolve(newCheckin);

      }).catch((e) =>
      {
        return reject(e);
      });
    });
  }

  /**
   *
   * @todo: it would be easier to use current Session Checkins and pop off the last one
   *
   * @param {Checkin} lastCheckin
   * @returns {Promise<any>}
   */
  protected updateDurationOfPreviousCheckin(lastCheckin: Checkin): Promise<any>
  {
    let self = this;

    return new Promise(function (resolve, reject)
    {
      //console.log("DURATION UPDATE - LAST: ", lastCheckin);

      let options = {
        selector: {
          checkin_date: {$lt: lastCheckin.checkin_date}
        },
        sort: [{checkin_date: 'desc'}],
        limit: 2
      };
      self.checkinProvider.findDocuments(options).then((res) =>
      {
        if (!_.isUndefined(res.docs[0]))
        {
          let previousCheckin = new Checkin(res.docs[0]);
          //console.log("DURATION UPDATE - PREV: ", previousCheckin);

          let checkin_date_last = lastCheckin.checkin_date;
          let checkin_date_prev = previousCheckin.checkin_date;
          let prevCheckinDuration = moment(checkin_date_last).diff(checkin_date_prev, "seconds");

          // console.log("LAST: ", checkin_date_last);
          // console.log("PREV: ", checkin_date_prev);
          // console.log("DUR: ", prevCheckinDuration);
          previousCheckin.duration = prevCheckinDuration.toString();
          previousCheckin.sync_state = CrmDataModel.SYNC_STATE__CHANGED;
          console.log("Storing duration of previous checkin(" + previousCheckin.id + "): ", prevCheckinDuration);
          return self.checkinProvider.storeCheckin(previousCheckin, true);
        } else {
          console.log("DURATION-UPDATE: NO DOCS");
          resolve();
        }
      }).then(() => {
        resolve();
      });
    });
  }

  /**
   * @todo: should keep track of company id as well
   * @todo: now storing "last_in_out_operation" - use that one
   *
   * @returns {Promise<any>}
   */
  private findLastInOutOperation(): Promise<any>
  {
    let self = this;

    let lastOperationType = Checkpoint.TYPE_OUT;
    let lastOperationDate = moment().format(CrmDataModel.CRM_DATE_FORMAT);


    return new Promise(function (resolve, reject)
    {
      //IN/OUT
      self.checkpointProvider.getInOutCheckpoints().then((inOutCheckpoints) =>
      {
        let idList = _.map(inOutCheckpoints, "id");
        self.checkinProvider.findDocuments({
          selector: {
            checkin_date: {$ne: ''},
            mkt_checkpoint_id_c: {$in: idList}
          },
          fields: ['checkin_date', 'mkt_checkpoint_id_c'],
        }).then((res) =>
        {
          if (_.size(res.docs))
          {
            let mostRecentCheckin = _.last(_.sortBy(res.docs, ['checkin_date']));
            //console.log("MOST RECENT CHECKIN: ", mostRecentCheckin);
            self.last_in_out_operation = new Checkin(mostRecentCheckin);

            let relatedCheckpoint = _.find(inOutCheckpoints, {id: self.last_in_out_operation.mkt_checkpoint_id_c});
            if (!_.isUndefined(relatedCheckpoint))
            {
              //console.log("RELATED CHK: ", relatedCheckpoint);
              lastOperationType = relatedCheckpoint["type"];
              lastOperationDate = self.last_in_out_operation.checkin_date;
            }
          }
          resolve();
        }).catch((e) =>
        {
          console.error(e);
          resolve();
        });
      });
    }).finally(() =>
    {
      self.last_operation_type = lastOperationType;
      self.last_operation_date = lastOperationDate;
      console.log("IDENTIFIED LAST IN/OUT OPERATION: " + lastOperationType + " @ " + lastOperationDate);
    });
  }

  //----------------------------------------------------------------------------------------------SIMPLE GETTERS/SETTERS
  /**
   *
   * @returns {boolean}
   */
  public getLastOperationType(): string
  {
    return this.last_operation_type;
  }

  /**
   * Destroys and recreates databases
   *
   * @returns {Promise}
   */
  public destroyLocalDataStorages(): Promise<any>
  {
    let self = this;

    return new Promise(function (resolve, reject)
    {
      let promises = [];
      promises.push(self.checkpointProvider.destroyDatabase());
      promises.push(self.checkinProvider.destroyDatabase());
      Promise.all(promises).then(() =>
      {
        resolve();
      }, (e) => {
        reject(e);
      });
    });
  }

  /**
   * Triggers data sync operation in every registered provider
   *
   * @param {boolean} pushOnly
   */
  public triggerProviderDataSync(pushOnly:boolean = false): Promise<any>
  {
    let self = this;

    return new Promise(function (resolve, reject)
    {
      let providers = [''];
      providers.push('checkpointProvider');
      providers.push('checkinProvider');


      Promise.reduce(providers, function (accu, item, index, length)
      {
        return new Promise(function (resolve, reject)
        {
          let hasFunctionToCall = false;
          if (_.has(self, item))
          {
            let provider = self[item];
            if (_.isFunction(provider.syncWithRemote))
            {
              hasFunctionToCall = true;
              provider.syncWithRemote(pushOnly).then(() => {
                resolve();
              });
            }
          }
          if(!hasFunctionToCall)
          {
            resolve();
          }
        });

      }).then(() =>
      {
        //console.log("All providers are in sync now");
        resolve();
      }).catch((e) =>
      {
        //console.error("Error when syncing providers: " + e);
        reject(e);
      });
    });
  }


  /**
   *
   * @param {boolean} [waitForProviderData]
   * @param {boolean} [skipDataSync]
   * @returns {Promise<any>}
   */
  public initialize(waitForProviderData:boolean = false, skipDataSync:boolean = false): Promise<any>
  {
    let self = this;

    return new Promise(function (resolve, reject)
    {
      //reset
      self.last_operation_type = Checkpoint.TYPE_OUT;
      self.last_operation_date = '';

      self.checkpointProvider.initialize().then(() =>
      {
        return self.checkinProvider.initialize();
      }).then(() =>
      {
        return self.findLastInOutOperation();
      }).then(() =>
      {
        return self.updateCurrentSessionCheckins();
      }).then(() =>
      {
        if(skipDataSync)
        {
          return resolve();
        }
        if(!waitForProviderData)
        {
          resolve();
        }
        return self.triggerProviderDataSync();
      }).then(() =>
      {
        //console.log("PROVIDER DATA IS IN SYNC NOW");
        //if(waitForProviderData)
        //{
        resolve();
        //}
      }).catch((e) =>
      {
        reject(e);
      });
    });
  }
}

