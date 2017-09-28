/**
 * Checkin Provider
 */
import {Injectable} from '@angular/core';
import {OfflineCapableRestService} from '../services/offline.capable.rest.service';
import {ConfigurationService} from '../services/configuration.service';
import {CheckpointProvider} from "../providers/checkpoint.provider";
import {LocalDocumentProvider} from './local.document.provider';
import {CrmDataModel} from '../models/crm.data.model';
import {Checkin} from '../models/Checkin';
import {Promise} from '../../node_modules/bluebird'
import _ from "lodash";
import * as moment from 'moment';

@Injectable()
export class CheckinProvider extends LocalDocumentProvider
{
  protected underlying_model:any = Checkin;

  database_name = "checkin";
  database_indices = [
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
  ];

  //@todo: remove this!!! MOVED TO MODEL!
  remote_table_name = "mkt_Checkin";

  constructor(
    protected configurationService: ConfigurationService
    , protected offlineCapableRestService: OfflineCapableRestService
    , private checkpointProvider: CheckpointProvider
  )
  {
    super(configurationService, offlineCapableRestService);

    let model = new Checkin();
    this.module_fields = model.getDefinedProperties();
  }

  /**
   *
   * @param {Checkin} checkin
   * @param {Boolean} [forceUpdate]
   * @returns {Promise<string>}
   */
  public storeCheckin(checkin: Checkin, forceUpdate: boolean = false): Promise<string>
  {
    let self = this;
    let storedDocumentId: string;
    return new Promise(function (resolve, reject)
    {
      self.storeDocument(checkin, forceUpdate).then((docId) =>
      {
        storedDocumentId = docId;
        if (self.offlineCapableRestService.isNetworkConnected())
        {
          return self.syncWithRemote_PUSH();
        } else
        {
          console.log("No network connection - skipping rest updates...");
          resolve(storedDocumentId);
        }
      }).then(() =>
      {
        resolve(storedDocumentId);
      }).catch((e) =>
      {
        console.error(e);
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
   * @param {boolean} pushOnly
   * @returns {Promise<any>}
   */
  public syncWithRemoteOLD(pushOnly: boolean = false): Promise<any>
  {
    let self = this;

    return new Promise(function (resolve, reject)
    {
      let syncMethods = [''];
      syncMethods.push('syncWithRemote_PUSH');
      if (pushOnly == false)
      {
        syncMethods.push('syncWithRemote_PULL');
      }

      Promise.reduce(syncMethods, function (accu, item, index, length)
      {
        return new Promise(function (resolve, reject)
        {
          let hasFunctionToCall = false;

          if (_.isFunction(self[item]))
          {
            let fn = self[item];
            hasFunctionToCall = true;
            fn.apply(self).then(() =>
            {
              resolve();
            });
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


  /**
   *
   * @returns {Promise<any>}
   */
  private syncWithRemote_PUSH(): Promise<any>
  {
    let self = this;

    return new Promise(function (resolve, reject)
    {
      //console.log("syncWithRemote_PUSH - START ---------------");

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
              console.log("PUSHING TO REMOTE WITH PARAMS: ", parameters);
              self.offlineCapableRestService.setEntry(self.remote_table_name, (isNewOnRemote ? false : checkin.id), parameters).then((res) =>
              {
                if (!res || _.isUndefined(res.id) || !_.isArray(res.entry_list) || _.size(res.entry_list) == 0)
                {
                  throw new Error("failed to save on remote!");
                }
                console.log("Saved on remote: ", res);
                let currentLocalStorageId = checkin.id;
                checkin.id = res.id;
                checkin.sync_state = CrmDataModel.SYNC_STATE__IN_SYNC;
                return self.storeDocument(checkin, true, currentLocalStorageId);
              }).then((res) =>
              {
                resolve();
              }).catch((e) =>
              {
                console.warn("Remote save error! ", e);
                //reject(e);
                resolve();
              });
            });
          }).then(() =>
          {
            resolve();
          }).catch((e) =>
          {
            console.warn("syncWithRemote_PUSH[reduce] error!", e);
            resolve();
          });
        } else
        {
          console.log("NOTHING TO SYNC");
          resolve();
        }
      }).catch((e) =>
      {
        console.warn("syncWithRemote_PUSH[find doc] error!", e);
        resolve();
      });
    });
  }

  /**
   *
   * @returns {Promise<any>}
   */
  private syncWithRemote_PULL(): Promise<any>
  {
    let self = this;
    let forceUpdate = false;
    let batchSize = 50;
    let maxRecords = 100;
    let recordCount = 0;

    return new Promise(function (resolve, reject)
    {
      let sequence = 0;
      let offset = 0;
      let hasMore = true;
      self.promiseWhile(hasMore, function (hasMore)
      {
        return hasMore;
      }, function (hasMore)
      {
        return new Promise(function (resolve, reject)
        {
          offset = sequence * batchSize;
          self.offlineCapableRestService.getEntryList(self.remote_table_name, {
            select_fields: self.module_fields,
            order_by: 'checkin_date ASC',
            max_results: batchSize,
            offset: offset
          }).then((res) =>
          {
            //console.log("CHECKIN LIST[" + sequence + "]["+offset+"]", res);
            sequence++;
            recordCount += _.size(res.entry_list);
            hasMore = (res.next_offset < res.total_count) && (recordCount < maxRecords) && _.size(res.entry_list) > 0;
            if (!_.isEmpty(res.entry_list))
            {
              let documents = [];
              _.each(res.entry_list, function (remoteData)
              {
                //@todo: DATE TIME - UTC OFFSET FIX
                if (!_.isUndefined(remoteData.checkin_date))
                {
                  remoteData.checkin_date = moment(remoteData.checkin_date).add(CrmDataModel.UTC_OFFSET_HOURS, "hours").format(CrmDataModel.CRM_DATE_FORMAT);
                }

                let checkin = new Checkin(remoteData);
                documents.push(checkin);
              });

              self.checkpointProvider.setTypeOnCheckins(documents).then((documents) =>
              {
                return self.storeDocuments(documents, forceUpdate);
              }).then(() =>
              {
                resolve(hasMore);
              }).catch((e) =>
              {
                reject(e);
              });
            } else
            {
              resolve(hasMore);
            }
          })
        });
      }).then(() =>
      {
        self.getDatabaseInfo().then((res) =>
        {
          console.log("Checkin provider synced: " + res.doc_count + " records");
          resolve();
        });
      }).catch((e) =>
      {
        console.error(e);
      });
    });
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
