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
import { Promise } from '../../node_modules/bluebird'
//import * as Bluebird from "bluebird";
/*import md5 from '../../node_modules/blueimp-md5';*/

@Injectable()
export class RemoteDataService
{
  protected dataProviders: any = [];

  private last_checkin_operation: Checkin;

  private CURRENT_SESSION_CHECKINS: Checkin[];



  constructor(private offlineCapableRestService: OfflineCapableRestService
    , private userService: UserService
    , private network: Network
    , private platform: Platform
    , private checkpointProvider: CheckpointProvider
    , private checkinProvider: CheckinProvider)
  {
    this.dataProviders = [
      this.checkpointProvider,
      /*this.checkinProvider*/
    ];
  }





  //----------------------------------------------------------------------------------------------------------CHECKPOINT

  /**
   * @returns {Promise<any>}
   */
  public getRemoteIDList(): Promise<any>
  {
    let self = this;

    return new Promise(function (resolve, reject)
    {
      self.offlineCapableRestService.getEntryList(Checkpoint.DB_TABLE_NAME, {
        select_fields: ['id'],
        order_by: 'id ASC',
        'max_results': 50000
      }).then((res) =>
      {
        if(!_.isUndefined(res.entry_list))
        {
          return resolve(res.entry_list);
        } else {
          resolve([]);
        }
      }, (err) => {
        resolve([]);
      });
    });
  }


  //-------------------------------------------------------------------------------------------------------------CHECKIN


  /**
   * Return checkins since last "IN" in chronologically reversed order - this is for home display
   *
   * @returns {Checkin[]}
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
      self.CURRENT_SESSION_CHECKINS = [];

      self.getLastInOutOperation().then((operation: Checkin) =>
      {
        if (_.isNull(operation) || _.isEmpty(operation))
        {
          return resolve();
        }

        let fromDate = operation.checkin_date;
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
            _.each(res.docs, function (doc)
            {
              self.CURRENT_SESSION_CHECKINS.push(new Checkin(doc));
            });
          }

          console.log("CURRENT_SESSION_CHECKINS: ", self.CURRENT_SESSION_CHECKINS);

          if (!_.isUndefined(self.CURRENT_SESSION_CHECKINS[0]))
          {
            self.last_checkin_operation = self.CURRENT_SESSION_CHECKINS[0];
            //console.log("LAST IN OUT OP: ", self.last_checkin_operation);
          }

          resolve();
        });
      });
    });
  }

  /**
   * @todo: should keep track of company id as well
   *
   * @returns {Promise<any>}
   */
  private getLastInOutOperation(): Promise<Checkin>
  {
    let self = this;
    let lastInOutCheckin: Checkin;

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
            lastInOutCheckin = new Checkin(mostRecentCheckin);
          }
          resolve(lastInOutCheckin);
        }).catch((e) =>
        {
          console.error(e);
          resolve(lastInOutCheckin);
        });
      });
    }).finally(() =>
    {
      if (lastInOutCheckin)
      {
        console.log("IDENTIFIED LAST IN/OUT OPERATION: " + lastInOutCheckin.type + " @ " + lastInOutCheckin.checkin_date);
      }
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
   * @todo: do NOT set duration on "OUT" type checkins!
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
        if (_.isUndefined(res.docs[0]))
        {
          console.log("DURATION-UPDATE: No previous document was found.");
          resolve();
          return;
        }

        let previousCheckin = new Checkin(res.docs[0]);

        if (previousCheckin.type == Checkpoint.TYPE_OUT)
        {
          console.log("DURATION-UPDATE: Previous document is of type OUT - skipping.");
          resolve();
          return;

        }
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
      }).then(() =>
      {
        resolve();
      });
    });
  }


  //----------------------------------------------------------------------------------------------SIMPLE GETTERS/SETTERS
  /**
   *
   * @returns {Checkin}
   */
  public getLastOperation(): Checkin
  {
    if (_.isNull(this.last_checkin_operation))
    {
      throw new Error("Last Checkin operation has not been identified yet");
    }
    return this.last_checkin_operation;
  }


  /**
   *
   * @returns {Checkin}
   */
  public getSessionInOutOperation(): Checkin
  {
    if (_.isEmpty(this.CURRENT_SESSION_CHECKINS))
    {
      throw new Error("No Session Checkins");
    }

    return _.last(this.CURRENT_SESSION_CHECKINS) as Checkin;
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
      }, (e) =>
      {
        reject(e);
      });
    });
  }

  /**
   * Triggers data sync operation in every registered provider
   *
   * @param {boolean} [pushOnly]
   */
  public triggerProviderDataSync(pushOnly: boolean = false): Promise<any>
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
            if (_.isFunction(provider.syncWithRemoteOLD))
            {
              hasFunctionToCall = true;
              provider.syncWithRemoteOLD(pushOnly).then(() =>
              {
                resolve();
              });
            }
          }
          if (!hasFunctionToCall)
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


  //-------------------------------------------------------------------------------------------------SYNC DATA PROVIDERS

  /**
   *
   * @returns {Promise<any>}
   */
  public syncDataProviders(): Promise<any>
  {
    return Promise.reduce(this.dataProviders, function(accu, provider, index)
    {
      console.log("PROVIDER #" + index + " - " + provider.constructor.name);
      return provider.syncWithRemote();
    }, null);
  }


  /**
   *
   * @param {boolean} [waitForProviderData]
   * @param {boolean} [skipDataSync]
   * @returns {Promise<any>}
   */
  public initialize(waitForProviderData: boolean = false, skipDataSync: boolean = false): Promise<any>
  {
    let self = this;

    return new Promise(function (resolve, reject)
    {
      //reset
      self.last_checkin_operation = null;

      self.checkpointProvider.initialize().then(() =>
      {
        return self.checkinProvider.initialize();
      }).then(() =>
      {
        resolve();
        //return self.updateCurrentSessionCheckins();
      }, (e) => {
        return reject(e);
      })
    });
  }
}

