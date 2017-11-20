/**
 * Checkin Provider
 */
import {Injectable} from '@angular/core';
import {OfflineCapableRestService} from '../services/offline.capable.rest.service';
import {ConfigurationService} from '../services/configuration.service';
import {UserService} from "../services/user.service";
import {LocalDocumentProvider} from './local.document.provider';
import {CrmDataModel} from '../models/crm.data.model';
import {Checkin} from '../models/Checkin';
import {Promise} from '../../node_modules/bluebird'
import _ from "lodash";
import {LogService} from "../services/log.service";

@Injectable()
export class CheckinProvider extends LocalDocumentProvider
{
  protected underlying_model:any = Checkin;

  database_name = "checkin";

  constructor(
    protected configurationService: ConfigurationService
    , protected userService: UserService
    , protected offlineCapableRestService: OfflineCapableRestService
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
      processRecordsAtOnce: 25,
      maxRecords: 100
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
   * @param {string} [type]
   * @returns {Promise<Checkin>}
   */
  public getlastCheckinOperationByType(type: string = null): Promise<Checkin>
  {
    let self = this;
    return new Promise(function (resolve, reject)
    {
      let options = {
        selector: {
          checkin_date: {$gt: null},
        },
        sort: [{checkin_date: 'desc'}],
        limit: 1
      };

      if(!_.isEmpty(type))
      {
        options.selector["type"] = type;
      }

      self.findDocuments(options).then((res) =>
      {
        if (_.size(res.docs) == 1)
        {
          let doc = res.docs[0];
          let checkin = new Checkin(doc);
          resolve(checkin);
        } else {
          reject(new Error("Could not identify last checkin operation[type="+type+"]!"));
        }
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
  private syncWithRemote_PUSH__NEW__CHANGED_TEMPORARY(): Promise<any>
  {
    let self = this;
    let dbTableName = self.underlying_model.DB_TABLE_NAME;

    return new Promise(function (resolve)
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

          Promise.reduce(docs, function (accu, doc)
          {
            return new Promise(function (resolve)
            {
              let checkin = new Checkin(doc);
              let isNewOnRemote = _.startsWith(checkin.id, CrmDataModel.TEMPORARY_ID_PREFIX);
              let parameters = checkin.getRestData();
              if (isNewOnRemote)
              {
                _.unset(parameters, 'id');
              }
              LogService.log("PUSHING TO REMOTE WITH PARAMS: " + JSON.stringify(parameters));
              self.offlineCapableRestService.setEntry(dbTableName, (isNewOnRemote ? false : checkin.id), parameters).then((res) =>
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
              }).then(() =>
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
        name: 'idx_date_type',
        fields: ['checkin_date', 'type']
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
        resolve();
      }).catch((e) =>
      {
        reject(e);
      });
    });
  }
}
