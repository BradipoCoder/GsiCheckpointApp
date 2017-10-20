/**
 * Checkin Provider
 */
import {Injectable} from '@angular/core';
import {OfflineCapableRestService} from '../services/offline.capable.rest.service';
import {ConfigurationService} from '../services/configuration.service';
import {UserService} from "../services/user.service";
import {CheckpointProvider} from "./checkpoint.provider";
import {LocalDocumentProvider} from './local.document.provider';
import {CrmDataModel} from '../models/crm.data.model';
import {Checkin} from '../models/Checkin';
import {Promise} from '../../node_modules/bluebird'
import _ from "lodash";
import * as moment from 'moment';
import {LogService} from "../services/log.service";

@Injectable()
export class CheckinProvider extends LocalDocumentProvider
{
  protected underlying_model:any = Checkin;

  database_name = "checkin";

  //@todo: remove this!!! MOVED TO MODEL!
  remote_table_name = "mkt_Checkin";

  constructor(
    protected configurationService: ConfigurationService
    , protected userService: UserService
    , protected offlineCapableRestService: OfflineCapableRestService
    , protected checkpointProvider: CheckpointProvider
  )
  {
    super(configurationService, offlineCapableRestService);

    let model = new Checkin();
    this.module_fields = model.getDefinedProperties();

    //{auto_compaction: true, revs_limit: 10}
    //this.database_options.revs_limit = 1;

    /*
    * remoteQuery - CRM is role based - no need to filter by user id (it will NOT work)
    */
    this.sync_configuration = {
      syncFunctions: ['syncDownNew', 'syncDownChanged', 'syncDownDeleted', 'syncWithRemote_PUSH__NEW__CHANGED_TEMPORARY'],
      remoteDbTableName: this.underlying_model.DB_TABLE_NAME,
      remoteQuery: "",
      processRecordsAtOnce: 25
    };
  }

  /**
   *
   * @param {Checkin} checkin
   * @param {Boolean} [forceUpdate]
   * @param {String} [findById] - when document contains the new id - you need to use this param to find the document
   * @returns {Promise<string>}
   */
  public store(checkin: Checkin, forceUpdate: boolean = false, findById: any = false): Promise<string>
  {
    return super.storeDocument(checkin, forceUpdate, findById);
  }


  /**
   * Returns checkpoints found by options
   *
   * @returns {Promise<any>}
   */
  public find(options: any): Promise<any>
  {
    let self = this;
    return new Promise(function (resolve, reject) {
      self.findDocuments(options).then((res) => {
        let answer = [];
        if (!_.isUndefined(res.docs) && _.size(res.docs))
        {
          let docs = _.concat([], res.docs);
          _.each(docs, function (doc) {
            answer.push(new Checkin(doc));
          });
        }
        resolve(answer);
      }).catch((e) => {
        LogService.log(e, LogService.LEVEL_ERROR);
        reject(e);
      });
    });
  }

  /**
   * @todo: use getDocumentById !!! to find doc
   * @param {string} id
   * @returns {Promise<Checkin>}
   */
  public getCheckinById(id: string): Promise<Checkin>
  {
    let self = this;
    return new Promise(function (resolve, reject)
    {
      self.getDocumentById(id).then((doc) =>
      {
        let checkin = new Checkin(doc);
        resolve(checkin);
      }).catch((e) =>
      {
        reject(e);
      });
    });
  }

  /**
   *
   * @returns {Promise<any>}
   */
  private syncWithRemote_PUSH__NEW__CHANGED_TEMPORARY(): Promise<any>
  {
    let self = this;

    return new Promise(function (resolve, reject)
    {
      //LogService.log("syncWithRemote_PUSH - START ---------------");

      self.findDocuments({
        selector: {
          $or: [
            {sync_state: CrmDataModel.SYNC_STATE__NEW},
            {sync_state: CrmDataModel.SYNC_STATE__CHANGED},
          ]
        },
        /*fields: ['checkin_date', 'mkt_checkpoint_id_c'],*/
      }).then((res) =>
      {
        if (_.size(res.docs))
        {
          let docs = _.concat([""], res.docs);//for Promise.reduce

          Promise.reduce(docs, function (accu, doc, index, length)
          {
            return new Promise(function (resolve, reject)
            {
              let checkin = new Checkin(doc);
              let isNewOnRemote = _.startsWith(checkin.id, CrmDataModel.TEMPORARY_ID_PREFIX);
              let parameters = checkin.getRestData();
              if (isNewOnRemote)
              {
                _.unset(parameters, 'id');
              }
              LogService.log("PUSHING TO REMOTE WITH PARAMS: " + JSON.stringify(parameters));
              self.offlineCapableRestService.setEntry(self.remote_table_name, (isNewOnRemote ? false : checkin.id), parameters).then((res) =>
              {
                if (!res || _.isUndefined(res.id) || !_.isArray(res.entry_list) || _.size(res.entry_list) == 0)
                {
                  throw new Error("failed to save on remote!");
                }
                LogService.log("Saved on remote: " + JSON.stringify(res));
                let currentLocalStorageId = checkin.id;
                checkin.id = res.id;
                checkin.sync_state = CrmDataModel.SYNC_STATE__IN_SYNC;
                return self.storeDocument(checkin, true, currentLocalStorageId);
              }).then((res) =>
              {
                resolve();
              }).catch((e) =>
              {
                LogService.log("Remote save error! " + e, LogService.LEVEL_WARN);
                //reject(e);
                resolve();
              });
            });
          }).then(() =>
          {
            resolve();
          }).catch((e) =>
          {
            LogService.log("syncWithRemote_PUSH[reduce] error! " + e, LogService.LEVEL_WARN);
            resolve();
          });
        } else
        {
          LogService.log("CHECKIN PROVIDER - NOTHING TO SYNC UP");
          resolve();
        }
      }).catch((e) =>
      {
        LogService.log("syncWithRemote_PUSH[find doc] error! " + e, LogService.LEVEL_WARN);
        resolve();
      });
    });
  }

  /**
   * @returns {any}
   */
  protected getDbIndexDefinition():any
  {
    return _.concat(super.getDbIndexDefinition(), [
      {
        name: 'idx_date',
        fields: ['checkin_date']
      },
      {
        name: 'idx_checkpoint',
        fields: ['mkt_checkpoint_id_c']
      },
      {
        name: 'idx_date_checkpoint',
        fields: ['checkin_date', 'mkt_checkpoint_id_c']
      },
      {
        name: 'idx_sync_state',
        fields: ['sync_state']
      }
    ]);
  }

  /**
   * @returns {Promise<any>}
   */
  public initialize(): Promise<any>
  {
    let self = this;
    return new Promise(function (resolve, reject)
    {
      self.setupDatabase().then(() =>
      {

        // MY checkins - this cannot be done in constructor because userService is not yet inited
        /*self.sync_configuration.remoteQuery = "user_id_c = '" + self.userService.getUserData("user_id") + "'";*/

        resolve();
      }).catch((e) =>
      {
        reject(e);
      });
    });
  }
}
