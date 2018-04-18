/**
 * A centralized place for data
 *
 */
import {Injectable} from '@angular/core';
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
import {TaskProvider} from "../providers/task.provider";
/* Utils */
import _ from "lodash";
import * as moment from 'moment';
import {Promise} from '../../node_modules/bluebird'
import {LogService} from "./log.service";
import {LocalDocumentProvider} from "../providers/local.document.provider";
//import * as Bluebird from "bluebird";
/*import md5 from '../../node_modules/blueimp-md5';*/

@Injectable()
export class RemoteDataService
{
  private providers: LocalDocumentProvider[];

  private last_checkin_operation: Checkin;

  private updating_session_checkins = false;

  private CURRENT_SESSION_CHECKINS: Checkin[];

  private _CHECKIN_TO_MODIFY_: Checkin;

  /* for Home - HomeCheckinViewPage*/
  public HomeCheckinViewPageData:any;

  constructor(private offlineCapableRestService: OfflineCapableRestService
    , private userService: UserService
    , private checkpointProvider: CheckpointProvider
    , private checkinProvider: CheckinProvider
    , private taskProvider: TaskProvider)
  {
    this.providers = [
      this.checkpointProvider,
      this.checkinProvider,
      this.taskProvider,
    ];

    this._CHECKIN_TO_MODIFY_ = null;
  }

  //----------------------------------------------------------------------------------------------------------CHECKPOINT

  /**
   * @returns {Promise<any>}
   */
  public getRemoteIDList(): Promise<any>
  {
    let self = this;

    return new Promise(function (resolve)
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
      }, () => {
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
    return new Promise((resolve) =>
    {
      if(self.updating_session_checkins == true)
      {
        //already working on it
        return resolve();
      }
      self.updating_session_checkins = true;

      self.CURRENT_SESSION_CHECKINS = [];

      self.getLastInOutOperation().then((operation: Checkin) =>
      {
        if (_.isNull(operation) || _.isEmpty(operation))
        {
          self.updating_session_checkins = false;
          return resolve();
        }

        let fromDate = operation.checkin_date;
        //LogService.log("Updating CURRENT_SESSION_CHECKINS (from date: "+fromDate+")...");

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
            let checkin: Checkin;
            _.each(res.docs, function (doc)
            {
              checkin = self.checkinProvider.getNewModelInstance(doc);
              self.CURRENT_SESSION_CHECKINS.push(checkin);
            });
          }

          //LogService.log("CURRENT_SESSION_CHECKINS: "+ JSON.stringify(self.CURRENT_SESSION_CHECKINS));

          if (!_.isUndefined(self.CURRENT_SESSION_CHECKINS[0]))
          {
            self.last_checkin_operation = self.CURRENT_SESSION_CHECKINS[0];
            //LogService.log("LAST IN OUT OP: ", self.last_checkin_operation);
          }

          self.updating_session_checkins = false;
          resolve();
        });
      });
    });
  }

  /**
   * @returns {Promise<any>}
   */
  private getLastInOutOperation(): Promise<Checkin>
  {
    let self = this;
    let lastInOutCheckin: Checkin;

    return new Promise(function (resolve)
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
            //LogService.log("CHECKIN LIST: " + JSON.stringify(res.docs));
            let mostRecentCheckin = _.last(_.sortBy(res.docs, ['checkin_date']));
            //LogService.log("MOST RECENT CHECKIN: ", mostRecentCheckin);
            lastInOutCheckin = self.checkinProvider.getNewModelInstance(mostRecentCheckin);
          }
          resolve(lastInOutCheckin);
        }).catch((e) =>
        {
          LogService.log(e, LogService.LEVEL_ERROR);
          resolve(lastInOutCheckin);
        });
      });
    }).finally(() =>
    {
      if (lastInOutCheckin)
      {
        LogService.log("IDENTIFIED LAST IN/OUT OPERATION: " + lastInOutCheckin.type + " @ " + lastInOutCheckin.checkin_date);
      }
    });
  }

  /**
   * Register a new CHECKIN for current user at current time by matching the code passed of the checkpoints
   *
   * @param {Checkpoint} checkpoint
   * @returns {Promise<Checkin>}
   */
  public storeNewCheckinForCheckpoint(checkpoint: Checkpoint): Promise<Checkin>
  {
    let self = this;
    let checkin: Checkin;

    return new Promise((resolve, reject) =>
    {

      let now = moment.tz(moment(), "Europe/Rome").tz("GMT+0");

      checkin = self.checkinProvider.getNewModelInstance({
        name: checkpoint.name,
        duration: 0,
        description: '',
        checkin_date: now.format(CrmDataModel.CRM_DATE_FORMAT),
        date_entered: now.format(CrmDataModel.CRM_DATE_FORMAT),
        date_modified: now.format(CrmDataModel.CRM_DATE_FORMAT),

        user_id_c: self.userService.getUserData("id"),
        assigned_user_id: self.userService.getUserData("id"),
        checkin_user: self.userService.getUserData("full_name"),
        mkt_checkpoint_id_c: checkpoint.id,
        type: checkpoint.type,
        code: checkpoint.code,
        sync_state: CrmDataModel.SYNC_STATE__NEW
      });

      self.checkinProvider.store(checkin).then((checkinId) =>
      {
        LogService.log("New Checkin stored with id: " + checkinId);
        return self.checkinProvider.getCheckinById(checkinId);
      }, (e) => {
        return reject(e);
      }).then((newCheckin:Checkin) =>
      {
        checkin = newCheckin;
        LogService.log("LOADED NEW CHECKIN: " /*+ JSON.stringify(checkin)*/);
        return self.updateDurationOfPreviousCheckin(checkin);
      }, (e) => {
        return reject(e);
      }).then(() => {
        LogService.log("PREVIOUS CHECKIN DURATION UPDATED.");
        //removed: return self.updateCurrentSessionCheckins();
        resolve(checkin);
      }, (e) => {
        return reject(e);
      });
    });
  }

  /**
   * Register a new PAUSE CHECKIN for current user at current time
   *
   * @returns {Promise<string>}
   */
  public storePauseCheckin(): Promise<Checkin>
  {
    let self = this;

    return new Promise(function (resolve, reject)
    {
      self.checkpointProvider.getCheckpoint({selector: {code: "PAUSA"}}).then((relativeCheckpoint) =>
      {
        return self.storeNewCheckinForCheckpoint(relativeCheckpoint);
      }, (e) =>
      {
        return reject(e);
      }).then((checkin:Checkin) =>
      {
        resolve(checkin);
      }, (e) =>
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

    return new Promise(function (resolve)
    {
      //LogService.log("DURATION UPDATE - LAST: ", lastCheckin);

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
          LogService.log("DURATION-UPDATE: No previous document was found.");
          resolve();
          return;
        }

        let previousCheckin = self.checkinProvider.getNewModelInstance(res.docs[0]);

        if (previousCheckin.type == Checkpoint.TYPE_OUT)
        {
          LogService.log("DURATION-UPDATE: Previous document is of type OUT - skipping.");
          resolve();
          return;
        }
        //LogService.log("DURATION UPDATE - PREV: ", previousCheckin);
        let checkin_date_last = lastCheckin.checkin_date;
        let checkin_date_prev = previousCheckin.checkin_date;
        let prevCheckinDuration = moment(checkin_date_last).diff(checkin_date_prev, "seconds");

        // LogService.log("LAST: ", checkin_date_last);
        // LogService.log("PREV: ", checkin_date_prev);
        // LogService.log("DUR: ", prevCheckinDuration);
        previousCheckin.duration = prevCheckinDuration.toString();
        previousCheckin.sync_state = CrmDataModel.SYNC_STATE__CHANGED;
        LogService.log("Storing duration of previous checkin(" + previousCheckin.id + "): " + JSON.stringify(prevCheckinDuration));
        return self.checkinProvider.store(previousCheckin, true);
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
    if (_.isUndefined(this.last_checkin_operation) || _.isNull(this.last_checkin_operation))
    {
      throw new Error("Last Checkin operation has not been identified yet!");
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
   *
   * @returns {Checkin}
   */
  public getCheckinToModify(): Checkin
  {
    return this._CHECKIN_TO_MODIFY_;
  }

  public setCheckinToModify(value: Checkin)
  {
    this._CHECKIN_TO_MODIFY_ = !_.isEmpty(value) ? value : null;
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
      promises.push(self.taskProvider.destroyDatabase());
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
   *
   * @returns {Promise<any>}
   */
  public initialize(): Promise<any>
  {
    let self = this;

    return new Promise(function (resolve, reject)
    {
      Promise.reduce(self.providers, (accu, provider) => {
        return provider.initialize();
      }, null).then(() => {
        self.updateCurrentSessionCheckins().then(() => {
          resolve();
        }, (e) => {
          reject();
        });
      });
    });
  }
}
