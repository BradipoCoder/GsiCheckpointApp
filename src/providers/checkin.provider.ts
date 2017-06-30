/**
 * Checkin Provider
 */
import {Injectable} from '@angular/core';
import {OfflineCapableRestService} from '../services/offline.capable.rest.service';
import {RestDataProvider} from './rest.data.provider';
import {CrmDataModel} from '../models/crm.data.model';
import {Checkin} from '../models/Checkin';
import {Promise} from '../../node_modules/bluebird'
import _ from "lodash";
import * as moment from 'moment';

@Injectable()
export class CheckinProvider extends RestDataProvider
{
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

  remote_table_name = "mkt_Checkin";

  constructor(protected offlineCapableRestService: OfflineCapableRestService)
  {
    super(offlineCapableRestService);

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
        if(self.offlineCapableRestService.isNetworkConnected())
        {
          return self.syncWithRemote_PUSH();
        } else {
          console.log("No network connection - skipping rest updates...");
          resolve(storedDocumentId);
        }
      }).then(() => {
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
  public getCheckinById(id:string): Promise<Checkin>
  {
    let self = this;
    return new Promise(function (resolve, reject)
    {
      self.getDocumentById(id).then((doc) => {
        let checkin = new Checkin(doc);
        resolve(checkin);
      }).catch((e) => {
        reject(e);
      });
    });
  }


  /**
   *
   * @returns {Promise<any>}
   */
  public syncWithRemote(): Promise<any>
  {
    let self = this;

    return new Promise(function (resolve, reject)
    {
      let syncMethods = [''];
      syncMethods.push('syncWithRemote_PUSH');
      syncMethods.push('syncWithRemote_PULL');

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
              let id = (doc.sync_state == CrmDataModel.SYNC_STATE__CHANGED) ? doc.id: false;
              let parameters = checkin.getRestData();
              if(!id) {
                _.unset(parameters, 'id');
              }
              console.log("PUSHING TO REMOTE WITH PARAMS:   ", parameters);
              self.offlineCapableRestService.setEntry(self.remote_table_name, id, parameters).then((res) => {
                console.log("Saved on remote: ", res);
                let currentLocalStorageId = checkin.id;
                checkin.id = res.id;
                checkin.sync_state = CrmDataModel.SYNC_STATE__IN_SYNC;
                return self.storeDocument(checkin, true, currentLocalStorageId);
              }).then((res) => {
                resolve();
              }).catch((e) => {
                reject(e);
              });
            });
          }).then(() => {
            resolve();
          }).catch((e) => {
            reject(e);
          });
        } else {
          console.log("NOTHING TO SYNC");
          resolve();
        }
      }).catch((e) =>
      {
        console.error(e);
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
                documents.push(new Checkin(remoteData));
              });
              self.storeDocuments(documents, forceUpdate).then(() =>
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
