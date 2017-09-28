/**
 * Checkpoint Provider
 */

import {Injectable} from '@angular/core';
import {OfflineCapableRestService} from '../services/offline.capable.rest.service';
import {ConfigurationService} from '../services/configuration.service';
import {LocalDocumentProvider} from './local.document.provider';
import {Checkpoint} from '../models/Checkpoint';
import {Checkin} from '../models/Checkin';
import {Promise} from '../../node_modules/bluebird'
import _ from "lodash";
import * as moment from 'moment';
import {CrmDataModel} from "../models/crm.data.model";

@Injectable()
export class CheckpointProvider extends LocalDocumentProvider
{
  protected underlying_model:any = Checkpoint;

  protected database_name = "checkpoint";

  protected database_indices = [
    {
      name: 'idx_date_modified',
      fields: ['date_modified']
    }, {
      name: 'idx_date_entered',
      fields: ['date_entered']
    }, {
      name: 'idx_sync_last_check',
      fields: ['sync_last_check']
    },
    {
      name: 'idx_type',
      fields: ['type']
    },
    {
      name: 'idx_code',
      fields: ['code']
    },
    {
      name: 'idx_company',
      fields: ['account_id_c']
    },
    {
      name: 'idx_company_type',
      fields: ['account_id_c', 'type']
    }
  ];

  //@todo: remove this!!! MOVED TO MODEL!
  protected remote_table_name = "mkt_Checkpoint";


  constructor(protected configurationService: ConfigurationService,
              protected offlineCapableRestService: OfflineCapableRestService)
  {
    super(configurationService, offlineCapableRestService);

    let model = new Checkpoint();
    this.module_fields = model.getDefinedProperties();
  }

  /**
   *
   * @param {Checkpoint} checkpoint
   * @param {Boolean} [forceUpdate]
   * @param {String} [findById] - when document contains the new id - you need to use this param to find the document
   * @returns {Promise<string>}
   */
  public store(checkpoint: Checkpoint, forceUpdate: boolean = false, findById: any = false): Promise<string>
  {
    return super.storeDocument(checkpoint, forceUpdate, findById);
  }

  /**
   *
   * @param {{}} options
   * @returns {Promise<Checkpoint>}
   */
  public getCheckpoint(options: any): Promise<Checkpoint>
  {
    let self = this;
    return new Promise(function (resolve, reject) {
      self.findDocuments(options).then((res) => {
        if (_.size(res.docs) < 1)
        {
          throw new Error("Codice locale sconosciuto!");
        }
        if (_.size(res.docs) > 1)
        {
          throw new Error("Locali multipli per il codice!");
        }
        let checkpoint = new Checkpoint(res.docs[0]);
        resolve(checkpoint);
      }).catch((e) => {
        reject(e);
      });
    });
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
            answer.push(new Checkpoint(doc));
          });
        }
        resolve(answer);
      }).catch((e) => {
        console.error(e);
        reject(e);
      });
    });
  }

  /**
   * Returns all IN and OUT type checkpoints
   *
   * @returns {Promise<any>}
   */
  public getInOutCheckpoints(): Promise<any>
  {
    let self = this;
    return new Promise(function (resolve, reject) {
      let findPromises = [];
      //@todo: for some reason index on 'type' does not work - when using combined selector
      findPromises.push(self.findDocuments({selector: {type: Checkpoint.TYPE_IN}}));
      findPromises.push(self.findDocuments({selector: {type: Checkpoint.TYPE_OUT}}));
      Promise.all(findPromises).then((res) => {
        let answer = [];
        _.each(res, function (obj) {
          answer = _.concat(answer, obj.docs);
        });
        resolve(answer);
      }).catch((e) => {
        console.error(e);
        reject(e);
      });
    });
  }

  /**
   *
   * @param {any} documents
   * @returns {Promise<any>}
   */
  public setTypeOnCheckins(documents): Promise<any>
  {
    let self = this;

    return new Promise(function (resolve, reject) {
      let promises = [];
      _.each(documents, function (checkin) {
        promises.push(self.setTypeOnCheckin(checkin));
      });
      Promise.all(promises).then((newDocs) => {
        resolve(newDocs);
      });
    });
  }

  /**
   *
   * @param {Checkin} checkin
   * @returns {Promise<any>}
   */
  public setTypeOnCheckin(checkin: Checkin): Promise<any>
  {
    let self = this;

    return new Promise(function (resolve) {
      self.db.get(checkin.mkt_checkpoint_id_c).then((checkpoint: Checkpoint) => {
        checkin.setType(checkpoint.type);
        resolve(checkin);
      }).catch(() => {
        resolve(checkin);
      });
    });
  }


  /**
   * Returns number of NEW items synced DOWN from remote
   * [ called by localDocumentProvider.syncWithRemote ]
   *
   * @param {number} [maxItemsToSync]
   * @returns {Promise<number>}
   */
  public syncWithRemoteDownNew___OLD(maxItemsToSync: number = 0): Promise<number>
  {
    let self = this;
    let syncCount = 0;
    let dbTableName = Checkpoint.DB_TABLE_NAME;
    let configCheckKey = dbTableName + "_last_down_new_offset";
    let configCheckValue;
    let remoteIdArray, localIdArray, missingIdArray;

    return new Promise(function (resolve, reject) {
      self.configurationService.getConfig(configCheckKey, 0)
        .then((lastDownNewOffset: string) => {
          //console.log("lastDownNewOffset: " + lastDownNewOffset);
          configCheckValue = lastDownNewOffset;

          // console.log("syncWithRemoteDownNew maxItemsToSync: " + maxItemsToSync);

          let query = "account_id_c = '" + "3aaaca35-bf86-5e1b-488b-591abe50a893" + "'";

          self.offlineCapableRestService.getEntryList(Checkpoint.DB_TABLE_NAME, {
            select_fields: ['id', 'date_entered', 'date_modified', 'deleted'],
            order_by: 'date_entered ASC',
            deleted: '1',
            query: query,
            offset: lastDownNewOffset,
            max_results: maxItemsToSync
          }).then((res) => {
            let records = !_.isUndefined(res.entry_list) ? res.entry_list : [];
            console.log("RECORDS: ", records);


            remoteIdArray = _.map(records, 'id');
            //console.log("REMOTE ID ARRAY: ", remoteIdArray);

            configCheckValue = _.size(remoteIdArray) ? configCheckValue + _.size(remoteIdArray) : 0;

            self.findDocuments({
              selector: {id: {'$in': remoteIdArray}},
              fields: ['id'],
            }).then((docs) => {
              let records = !_.isUndefined(docs.docs) ? docs.docs : [];
              //console.log("EntryList records: ", records);
              localIdArray = _.map(records, 'id');
              //console.log("LOCAL ID ARRAY: ", localIdArray);

              missingIdArray = _.difference(remoteIdArray, localIdArray);
              //console.log("MISSING ID ARRAY: ", missingIdArray);

              //store new configCheckValue
              self.configurationService.setConfig(
                configCheckKey, configCheckValue, false, true
              ).then(() => {
                self.offlineCapableRestService.getEntries(self.remote_table_name, {
                  select_fields: self.module_fields,
                  ids: missingIdArray
                }).then((res) => {
                  let records = !_.isUndefined(res) && !_.isUndefined(res.entry_list) ? res.entry_list : [];
                  //console.log("RECORDS: ", records);

                  let documents = [];
                  _.each(records, function (record) {
                    documents.push(new Checkpoint(record));
                  });
                  console.log("DOCS: ", documents);
                  syncCount = _.size(documents);

                  self.storeDocuments(documents)
                    .then(() => {
                      resolve(syncCount);
                    }, (e) => {
                      return reject(new Error("store local docs error - " + e));
                    });
                }, (e) => {
                  return reject(new Error("load missing remote docs error - " + e));
                });
              }, (e) => {
                return reject(new Error("store Config[" + configCheckKey + "] error - " + e));
              });
            }, (e) => {
              return reject(new Error("get local Id array error - " + e));
            });
          }, (e) => {
            return reject(new Error("getEntryList error - " + e));
          });
        }, (e) => {
          return reject(new Error("get Config[" + configCheckKey + "] error - " + e));
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
    let batchSize = 100;
    let forceUpdate = false;

    return new Promise(function (resolve, reject) {
      //no need to do anything
      if (pushOnly)
      {
        return resolve();
      }

      let sequence = 0;
      let offset = 0;
      let hasMore = true;

      self.promiseWhile(hasMore, function (hasMore) {
        return hasMore;
      }, function (hasMore) {
        return new Promise(function (resolve, reject) {
          offset = sequence * batchSize;
          self.offlineCapableRestService.getEntryList(self.remote_table_name, {
            select_fields: self.module_fields,
            order_by: 'code ASC',
            max_results: batchSize,
            offset: offset
          }).then((res) => {
            //console.log("CHECKPOINT LIST["+sequence+"]["+offset+"]", res);
            sequence++;
            hasMore = (res.next_offset < res.total_count) && _.size(res.entry_list) > 0;

            if (!_.isEmpty(res.entry_list))
            {
              let documents = [];
              _.each(res.entry_list, function (remoteData) {
                //remoteData.sync_last_check

                documents.push(new Checkpoint(remoteData));
              });
              self.storeDocuments(documents, forceUpdate).then(() => {
                resolve(hasMore);
              }).catch((e) => {
                reject(e);
              });
            } else
            {
              resolve(hasMore);
            }
          })
        });
      }).then(() => {
        self.getDatabaseInfo().then((res) => {
          console.log("Checkpoint provider synced: " + res.doc_count + " records");
          resolve();
        });
      }).catch((e) => {
        console.error(e);
        reject(e);
      });
    });
  }

  /**
   * @returns {Promise<any>}
   */
  public initialize(): Promise<any>
  {
    //super.initialize();
    let self = this;
    return new Promise(function (resolve, reject) {
      self.setupDatabase().then(() => {
        resolve();
      }).catch((e) => {
        reject(e);
      });
    });
  }
}

