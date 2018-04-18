/** CORE */
import {Injectable} from '@angular/core';
/** SERVICES */
import {OfflineCapableRestService} from '../services/offline.capable.rest.service';
import {ConfigurationService} from '../services/configuration.service';

import {LogService} from "../services/log.service";
/** MODELS */
import {CrmDataModel} from '../models/crm.data.model';
import {Task} from "../models/Task";
import {Checkpoint} from "../models/Checkpoint";
import {Checkin} from "../models/Checkin";
/** OTHER */
import PouchDB from "pouchdb";
import PouchDBFind from "pouchdb-find";
import _ from "lodash";
import * as moment from 'moment';
import 'moment-timezone';
import {Promise} from '../../node_modules/bluebird'
import Rx from "rxjs/Rx";
import {Subject} from "rxjs/Subject";
import {Observable} from "rxjs/Observable";

PouchDB.plugin(PouchDBFind);
//PouchDB.debug.enable('pouchdb:find');
//PouchDB.debug.disable('pouchdb:find');

@Injectable()
export class LocalDocumentProvider
{
  protected underlying_model: any;

  protected database_name: string;
  protected database_options: any = {auto_compaction: false};

  protected sync_configuration: any = {
    syncFunctions: ['syncDownNew', 'syncDownChanged', 'syncDownDeleted'],
    remoteDbTableName: 'some_table',
    remoteQuery: '',
    processRecordsAtOnce: 25,
    maxRecords: 0
  };

  protected db: any;

  protected module_fields: any = [];

  private databaseChangeSubject: Subject<any> = new Rx.Subject();
  public databaseChangeObservable: Observable<any> = Rx.Observable.create(e => this.databaseChangeSubject = e);

  constructor(protected configurationService: ConfigurationService,
              protected offlineCapableRestService: OfflineCapableRestService)
  {
  }


  /**
   * All model instance creation must pass here
   *
   * @param {{}} data
   * @returns {Task|Checkpoint|Checkin|any}
   */
  public getNewModelInstance(data: any): any
  {
    //CONVERT DATES TO ACCOUNT FOR +2 from GMT
    data.date_entered = moment.tz(data.date_entered, "GMT+0").tz("Europe/Rome").format();
    data.date_modified = moment.tz(data.date_modified, "GMT+0").tz("Europe/Rome").format();
    if(_.has(data, 'checkin_date'))
    {
      data.checkin_date = moment.tz(data.checkin_date, "GMT+0").tz("Europe/Rome").format();
    }

    /*
    if (this.underlying_model.DB_TABLE_NAME == "mkt_Checkin")
    {
      LogService.log("CREATING MODEL INSTANCE FROM: " + JSON.stringify(data));
    }*/

    return new this.underlying_model(data);
  }

  /**
   *
   * @todo: all this sync business is to be moved to background sync service
   *
   * @returns {Promise<any>}
   */
  public syncWithRemote(): Promise<any>
  {
    let self = this;
    let syncFunctions = self.sync_configuration.syncFunctions;
    let remoteItems = [];

    return new Promise(function (resolve, reject) {
      self.syncWithRemoteGetItems(self.sync_configuration.remoteDbTableName, self.sync_configuration.maxRecords, self.sync_configuration.processRecordsAtOnce, self.sync_configuration.remoteQuery)
        .then((records: any) => {
            remoteItems = records;

            Promise.reduce(syncFunctions, function (accu, syncFunction) {
              return new Promise(function (resolve, reject) {
                if (!_.isFunction(self[syncFunction]))
                {
                  LogService.log("NO FN(" + syncFunction + ")!!!", LogService.LEVEL_ERROR);
                  resolve();
                  return;
                }

                let syncPromise = self[syncFunction].call(self, remoteItems);

                syncPromise.then(() => {
                  LogService.log("FN(" + syncFunction + ") done.");
                  resolve();
                }, (e) => {
                  LogService.log("FN(" + syncFunction + ") fail: " + e, LogService.LEVEL_ERROR);
                  return reject(e);
                })

              });
            }, null)
              .then(() => {
                  LogService.log("Promise Reduce done.");
                  resolve();
                }, (e) => {
                  return reject(new Error("syncWithRemote error: " + e));
                }
              );
          }, (e) => {
            LogService.log("syncWithRemoteGetItems failed: " + e, LogService.LEVEL_ERROR);
            return reject(new Error("Get Remote Items error: " + e));
          }
        );
    });
  }

  /**
   *
   * @param {any} itemsToCheck
   * @returns {Promise<any>}
   */
  public syncDownNew(itemsToCheck: any = []): Promise<any>
  {
    let self = this;
    let dbTableName = self.underlying_model.DB_TABLE_NAME;
    let remoteIdArray, localIdArray, missingIdArray = [];

    //we need these dates to confront later for sync
    let fixedModuleFields = self.module_fields;
    fixedModuleFields.push('date_entered');
    fixedModuleFields.push('date_modified');
    fixedModuleFields.push('created_by');
    fixedModuleFields.push('created_by_name');

    //keep only items that are not deleted
    itemsToCheck = _.filter(itemsToCheck, {deleted: '0'});
    //LogService.log("FILTERED ITEMS: " + _.size(itemsToCheck));

    return new Promise(function (resolve, reject) {
      remoteIdArray = _.map(itemsToCheck, 'id');
      //LogService.log("REMOTE ID ARRAY: ", remoteIdArray);

      self.findDocuments({
        selector: {id: {'$in': remoteIdArray}},
        fields: ['id'],
      }).then((docs) => {

        docs = !_.isUndefined(docs.docs) ? docs.docs : [];
        //LogService.log("Local documents: ", docs);

        localIdArray = _.map(docs, 'id');
        //LogService.log("LOCAL ID ARRAY: ", localIdArray);

        missingIdArray = _.difference(remoteIdArray, localIdArray);

        if (!_.size(missingIdArray))
        {
          //LogService.log("No new records.");
          resolve();
          return;
        }

        //LogService.log("MISSING ID ARRAY: ", missingIdArray);
        self.offlineCapableRestService.getEntries(dbTableName, {
          select_fields: fixedModuleFields,
          ids: missingIdArray
        }).then((res) => {
            let loadedModuleRecords = !_.isUndefined(res) && !_.isUndefined(res.entry_list) ? res.entry_list : [];


            let documents = [];
            let model;
            _.each(loadedModuleRecords, (record) => {
              model = self.getNewModelInstance(record);
              documents.push(model);
            });

            if (!_.size(documents))
            {
              //LogService.log("No new documents to register.");
              resolve();
              return;
            }
            LogService.log("NEW DOCS : #" + _.size(documents));

            self.storeDocuments(documents)
              .then(() => {
                resolve();
              }, (e) => {
                return reject(new Error("Store Local Documents error - " + e));
              });
          }, (e) => {
            return reject(new Error("Get Remote Entries error: " + e));
          }
        );
      }, (e) => {
        return reject(new Error("Get Local Documents error: " + e));
      });
    });
  }

  /**
   * @todo: use self.sync_configuration
   * [ called by localDocumentProvider.syncWithRemote ]
   *
   * @param {any} itemsToCheck
   * @returns {Promise<any>}
   */
  public syncDownChanged(itemsToCheck: any = []): Promise<any>
  {
    let self = this;
    let dbTableName = self.underlying_model.DB_TABLE_NAME;
    let remoteIdArray, updateIdArray = [];

    //we need these dates to confront later for sync
    let fixedModuleFields = self.module_fields;
    fixedModuleFields.push('date_entered');
    fixedModuleFields.push('date_modified');
    fixedModuleFields.push('created_by');
    fixedModuleFields.push('created_by_name');
    // 'created_by', 'created_by_name'

    //keep only items that are not deleted
    itemsToCheck = _.filter(itemsToCheck, {deleted: '0'});
    //LogService.log("FILTERED ITEMS: " + _.size(itemsToCheck));

    return new Promise(function (resolve, reject) {
      remoteIdArray = _.map(itemsToCheck, 'id');
      //LogService.log("REMOTE ID ARRAY: ", remoteIdArray);
      //LogService.log("Remote documents: ", itemsToCheck);

      self.findDocuments({
        selector: {id: {'$in': remoteIdArray}},
        fields: ['id', 'date_modified'],
      }).then((localDocs) => {

        localDocs = !_.isUndefined(localDocs.docs) ? localDocs.docs : [];

        //create date objects
        _.each(localDocs, (localDoc) => {
          localDoc.date_modified = moment(localDoc.date_modified);
        });
        //LogService.log("Local documents: ", localDocs);

        let remoteDoc;
        _.each(localDocs, (localDoc) => {
          remoteDoc = _.find(itemsToCheck, {id: localDoc.id});
          if (remoteDoc)
          {
            if (remoteDoc.date_modified.isAfter(localDoc.date_modified))
            {
              updateIdArray.push(localDoc.id);
            }
          }
        });

        if (!_.size(updateIdArray))
        {
          //LogService.log("No records to update.");
          resolve();
          return;
        }

        //LogService.log("Records to update: ", updateIdArray);

        self.offlineCapableRestService.getEntries(dbTableName, {
          select_fields: fixedModuleFields,
          ids: updateIdArray
        }).then((res) => {
          let records = !_.isUndefined(res) && !_.isUndefined(res.entry_list) ? res.entry_list : [];

          let documents = [];
          let model;
          _.each(records, function (record) {
            //model = new self.underlying_model(record);
            model = self.getNewModelInstance(record);
            documents.push(model);
          });

          if (!_.size(documents))
          {
            //LogService.log("No changed documents to update.");
            resolve();
            return;
          }
          LogService.log("CHANGED DOCS : #" + _.size(documents));
          //LogService.log("CHANGED DOCS TO UPDATE: ", documents);

          self.storeDocuments(documents)
            .then(() => {
              resolve();
            }, (e) => {
              return reject(new Error("Store Local Documents error - " + e));
            });
        }, (e) => {
          return reject(new Error("Get Remote Entries error: " + e));
        });
      }, (e) => {
        return reject(new Error("Get Local Documents error: " + e));
      });
    });
  }

  /**
   * @todo: this is not yet implemented
   * [ called by localDocumentProvider.syncWithRemote ]
   *
   * @param {any} itemsToCheck
   * @returns {Promise<any>}
   */
  public syncDownDeleted(itemsToCheck: any = []): Promise<any>
  {
    //let self = this;
    //let dbTableName = self.underlying_model.DB_TABLE_NAME;

    //keep only items that are deleted
    //itemsToCheck = _.filter(itemsToCheck, {deleted: '1'});
    //LogService.log("FILTERED (DELETED)ITEMS: " + _.size(itemsToCheck));

    return new Promise(function (resolve) {
      //LogService.log("syncDownDeleted: " + _.size(itemsToCheck));
      resolve();
    });
  }

  /**
   * Returns number of NEW items synced DOWN from remote
   * [ called by localDocumentProvider.syncWithRemote ]
   *
   * @param {string} dbTableName
   * @param {number} [maxRecords] - @todo: implement this for limiting records to fetch from server
   * @param {number} [itemsAtOnce]
   * @param {string} [query]
   * @returns {Promise<any>}
   */
  public syncWithRemoteGetItems(dbTableName: string, maxRecords: number = 0, itemsAtOnce: number = 0, query: string = ""): Promise<any>
  {
    let self = this;
    let config: any;

    let configCheckKey = dbTableName + "_sync_offset";
    let syncOffset = 0;

    return new Promise(function (resolve, reject) {
      self.configurationService.getConfigObject()
        .then((cfg) => {
            config = cfg;
            syncOffset = _.has(config, configCheckKey) ? config[configCheckKey] : 0;
            if (maxRecords > 0)
            {
              if (syncOffset + itemsAtOnce > maxRecords)
              {
                itemsAtOnce = maxRecords - syncOffset;
              }
              /* max_results: 0 below would result in loading 20 items (SugarCRM's default) so let's limit it to one */
              if (itemsAtOnce <= 0)
              {
                itemsAtOnce = 1;
              }
            }

            LogService.log("SYNC OFFSET[" + configCheckKey + "]: " + syncOffset);
            //LogService.log("LOADING FROM[" + dbTableName + "] WITH QUERY: " + query);
            LogService.log("ITEMS AT ONCE[maxRecords:" + maxRecords + "]: " + itemsAtOnce);


            self.offlineCapableRestService.getEntryList(dbTableName, {
              select_fields: ['id', 'date_entered', 'date_modified', 'deleted'],
              order_by: 'date_entered DESC',
              deleted: '1',
              query: query,
              offset: syncOffset,
              max_results: itemsAtOnce
            }).then((res) => {
                let records = !_.isUndefined(res.entry_list) ? res.entry_list : [];

                /*
                 * create date objects
                 * Raw server date/time is in GMT+0 TZ so we need to convert it
                 */
                _.each(records, (record) => {
                  record.date_entered = moment.tz(record.date_entered, "GMT+0").tz("Europe/Rome");
                  //record.date_entered = moment(record.date_entered);
                  //record.date_modified = moment(record.date_modified);
                  record.date_modified = moment.tz(record.date_modified, "GMT+0").tz("Europe/Rome");
                });
                //LogService.log("RECORDS: " + JSON.stringify(records));

                //let newSyncOffset = _.size(records) == itemsAtOnce ? syncOffset + itemsAtOnce : 0;
                let newSyncOffset = syncOffset + _.size(records);
                LogService.log("New SyncOffset: " + newSyncOffset);

                self.configurationService.setConfig(configCheckKey, newSyncOffset, false, true)
                  .then(() => {
                    //LogService.log("CFGKEY written");
                    resolve(records);
                  }, (e) => {
                    return reject(new Error("Set Config item error: " + e));
                  });
              }, (e) => {
                return reject(new Error("Get remote Items error: " + e));
              }
            );
          }, (e) => {
            return reject(new Error("Get ConfigObject error: " + e));
          }
        );
    });
  }

  /**
   * Resets offset key to ZERO (before full sync)
   * This key holds the index where automatic background sync is at the moment
   *
   * @returns {Promise<any>}
   */
  public resetSyncOffsetToZero(): Promise<any>
  {
    let self = this;
    let configCheckKey = this.underlying_model.DB_TABLE_NAME + "_sync_offset";
    return new Promise(function (resolve, reject) {
      self.configurationService.setConfig(configCheckKey, 0, false, true).then(() => {
        //LogService.log("Sync Offset for table(" + self.underlying_model.DB_TABLE_NAME + ") has been reset to zero.");
        resolve();
      }, e => {
        reject(e);
      });
    });
  }

  /**
   * Just a stupid difference calulation between total remote and local documents
   * To to this properly we should execute all the sync methods in dry mode
   *
   * @returns {Promise<number>}
   */
  public getSyncableDataCountDown(): Promise<number>
  {
    let self = this;
    let maxRecords = self.sync_configuration.maxRecords;
    let remoteCount, localCount;
    return new Promise(function (resolve) {
      self.getRemoteDataCount().then((cnt) => {
        remoteCount = maxRecords > 0 && cnt > maxRecords ? maxRecords : cnt;
        //remoteCount = cnt;
        self.getDatabaseDocumentCount().then((cnt) => {
          localCount = cnt;
          let diff = remoteCount - localCount;
          diff = diff > 0 ? diff : 0;

          resolve(diff);
        }, () => {
          resolve(0)
        })
      }, () => {
        resolve(0);
      });
    });
  }

  /**
   * @returns {Promise<number>}
   */
  public getSyncableDataCountUp(): Promise<number>
  {
    let self = this;

    return new Promise(function (resolve) {
      self.findDocuments({
        selector: {
          $or: [
            {sync_state: CrmDataModel.SYNC_STATE__NEW},
            {sync_state: CrmDataModel.SYNC_STATE__CHANGED},
          ]
        },
      }).then((res) => {
        let count = !_.isUndefined(res.docs) ? _.size(res.docs) : 0;
        resolve(count);
      }, () => {
        resolve(0);
      });
    });
  }

  /**
   *
   * @returns {Promise<number>}
   */
  public getSyncableDataCountUpAndDown(): Promise<number>
  {
    let self = this;
    return new Promise(function (resolve) {
      let countPromises = [
        self.getSyncableDataCountUp(),
        self.getSyncableDataCountDown(),
      ];
      Promise.all(countPromises).then((data: Array<any>) => {
        let total: number = 0;
        total += parseInt(data[0]);
        total += parseInt(data[1]);
        resolve(total);
      });
    });
  }


  public getRemoteDataCount(): Promise<number>
  {
    let self = this;
    let dbTableName = self.underlying_model.DB_TABLE_NAME;

    return new Promise(function (resolve) {
      let params = {
        select_fields: ['id'],
        deleted: '0',
        max_results: 1
      };
      if (!_.isUndefined(self.sync_configuration.remoteQuery) && !_.isEmpty(self.sync_configuration.remoteQuery))
      {
        params["query"] = self.sync_configuration.remoteQuery;
      }

      self.offlineCapableRestService.getEntryList(dbTableName, params).then((res) => {
        let count = !_.isUndefined(res.total_count) ? parseInt(res.total_count) : 0;
        resolve(count);
      }, () => {
        resolve(0);
      });
    });
  }


  /**
   *
   * @param {CrmDataModel} document
   * @param {Boolean} [forceUpdate]
   * @param {String} [findById] - when document contains the new id - you need to use this param to find the document
   * @returns {Promise<string>}
   */
  protected storeDocument(document: CrmDataModel, forceUpdate: boolean = false, findById: any = false): Promise<string>
  {
    let self = this;
    let key: string = findById || document.id;
    let doUpdate = false;

    return new Promise(function (resolve, reject) {
      self.getDocumentById(key).then((registeredDocument: any) => {
        //LogService.log("Doc found by key["+key+"]: " +  JSON.stringify(registeredDocument));
        doUpdate = document.isNewer(moment(registeredDocument.date_modified).toDate());
        if (doUpdate || forceUpdate)
        {
          document._id = registeredDocument._id;
          document._rev = registeredDocument._rev;

          self.db.put(document).then(() => {
            //LogService.log("Doc updated:", key, document);
            resolve(key);
          });
        } else
        {
          //LogService.log("Skipping doc update:", key, document);
          resolve(key);
        }

      }).catch(() => {
        document._id = key;
        self.db.put(document).then(() => {
          //LogService.log("Doc registered:", key, document);
          resolve(key);
        }).catch((e) => {
          LogService.log("Store Document Error - document: " + document, LogService.LEVEL_ERROR);
          LogService.log("Store Document Error - forceUpdate: " + forceUpdate, LogService.LEVEL_ERROR);
          LogService.log("Store Document Error - findById: " + findById, LogService.LEVEL_ERROR);
          LogService.log(e, LogService.LEVEL_ERROR);
          reject(e);
        });
      });
    });
  }

  /**
   *
   * @param {Array} documents
   * @param {Boolean} [forceUpdate]
   * @returns {Promise<any>}
   */
  protected storeDocuments(documents: any, forceUpdate: boolean = false): Promise<any>
  {
    let self = this;
    return new Promise(function (resolve) {
      let promises = [];
      _.each(documents, function (document) {
        promises.push(self.storeDocument(document, forceUpdate));
      });
      Promise.all(promises).then(() => {
        resolve();
      });
    });
  }

  /**
   * @see https://pouchdb.com/api.html#query_index
   * @param {{}} options
   * @returns {Promise<any>}
   */
  public findDocuments(options: any): Promise<any>
  {
    return this.db.find(options);
  }


  /**
   * @param {string} id
   * @returns {Promise<any>}
   */
  public getDocumentById(id: string): Promise<any>
  {
    let self = this;
    return new Promise(function (resolve, reject) {
      let isTemporaryId = _.startsWith(id, CrmDataModel.TEMPORARY_ID_PREFIX);
      if (isTemporaryId)
      {
        self.db.get(id).then((doc) => {
          resolve(doc);
        }).catch((e) => {
          reject(e);
        });
      } else
      {
        let options = {selector: {id: id}};
        self.findDocuments(options).then((res) => {
          if (_.size(res.docs) < 1)
          {
            return reject(new Error("Checkin was not found!"));
          }
          if (_.size(res.docs) > 1)
          {
            return reject(new Error("Multiple checkins were found!"));
          }
          let doc = _.first(res.docs);
          resolve(doc);
        }).catch((e) => {
          reject(e);
        });
      }
    });
  }

  /**
   * @see https://pouchdb.com/api.html#database_information
   * @returns @returns {Promise<any>}
   */
  public getDatabaseInfo(): Promise<any>
  {
    return this.db.info();
  }

  /**
   * @returns @returns {Promise<number>}
   */
  public getDatabaseDocumentCount(): Promise<number>
  {
    let self = this;
    let answer = 0;
    return new Promise(function (resolve) {
      self.getDatabaseInfo().then((info) => {
        let docCount = !_.isUndefined(info['doc_count']) ? parseInt(info['doc_count']) : 0;
        let indexCount = _.size(self.getDbIndexDefinition());
        //LogService.log("DBINFO["+info.db_name+"]- DOC_COUNT:" + info.doc_count + " UPDATE_SEQ:" + info.update_seq + " - INDEX_COUNT:" + indexCount, LogService.LEVEL_WARN);
        answer = docCount - indexCount;
        answer = answer > 0 ? answer : 0;
        resolve(answer);
      }, () => {
        resolve(answer);
      })
    });
  }

  /**
   *
   * @returns {Promise<any>}
   */
  public destroyDatabase(): Promise<any>
  {
    let self = this;
    return new Promise(function (resolve, reject) {
      self.db.destroy().then((res) => {
        LogService.log("DB destroyed: " + self.database_name, res);
        resolve();
      }).catch((e) => {
        reject(e);
      });
    });
  }

  /**
   *
   * @returns {Promise<any>}
   */
  protected setupDatabase(): Promise<any>
  {
    let self = this;

    return new Promise((resolve, reject) => {
      self.db = new PouchDB(self.database_name, self.database_options);
      LogService.log("Created DB: " + self.database_name);

      // CHANGE LISTENERS
      self.db.changes({
        since: 'now',
        live: true,
        include_docs: false
      }).on('change', function (change) {
        change.db = self.database_name;
        //LogService.log('DB['+self.underlying_model.DB_TABLE_NAME+'] CHANGE: ' +  JSON.stringify(change));
        self.databaseChangeSubject.next(change);
      }).on('error', function (err) {
        LogService.log('DB[' + self.underlying_model.DB_TABLE_NAME + '] ERROR: ' + err, LogService.LEVEL_ERROR);
        self.databaseChangeSubject.error(err);
      });

      //CREATE INDICES
      let indexCreationPromises = [];
      _.each(self.getDbIndexDefinition(), function (indexObject) {
        //LogService.log("Creating DB[" + self.database_name + "] INDEX: " + JSON.stringify(indexObject));
        indexCreationPromises.push(self.db.createIndex({index: indexObject}));
      });

      Promise.all(indexCreationPromises).then(() => {
        LogService.log("DB " + self.database_name + " indexes OK.");
        resolve();
      }).catch((e) => {
        LogService.log("DB SETUP ERROR: " + e);
        reject(e);
      });
    });
  }

  /**
   * Returns index definitions to be created during database creation
   * field 'id' is always indexed
   * @returns {any}
   */
  protected getDbIndexDefinition(): any
  {
    return [
      {
        name: 'idx_id',
        fields: ['id']
      }
    ];
  }
}
