/**
 * Rest Data Provider
 */
import {Injectable} from '@angular/core';

import {OfflineCapableRestService} from '../services/offline.capable.rest.service';
import {ConfigurationService} from '../services/configuration.service';

import {CrmDataModel} from '../models/crm.data.model';

import PouchDB from "pouchdb";
import PouchDBFind from "pouchdb-find";

import _ from "lodash";
import * as moment from 'moment';
import {Promise} from '../../node_modules/bluebird'

import Rx from "rxjs/Rx";
import {Observable} from "rxjs/Observable";
import {Subject} from "rxjs/Subject";


PouchDB.plugin(PouchDBFind);
//PouchDB.debug.enable('pouchdb:find');
PouchDB.debug.disable('pouchdb:find');


@Injectable()
export class LocalDocumentProvider
{
  protected underlying_model: any;

  protected database_name: string;
  protected database_options: any = {auto_compaction: true};

  protected database_indices: any = [];

  //@todo: remove this!!! MOVED TO MODEL!
  protected remote_table_name: string;

  protected sync_configuration: any = {
    syncFunctions: ['syncDownNew', 'syncDownChanged', 'syncDownDeleted'],
    remoteDbTableName: 'some_table',
    remoteQuery: '',
    processRecordsAtOnce: 25
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
   *
   * @todo: all this sync business is to be moved to background sync service
   *
   * @returns {Promise<any>}
   */
  public syncWithRemote(): Promise<any>
  {
    let self = this;

    let syncFunctions = self.sync_configuration.syncFunctions;
    let remoteDbTableName = self.sync_configuration.remoteDbTableName;
    let remoteQuery = self.sync_configuration.remoteQuery;
    let processRecordsAtOnce = self.sync_configuration.processRecordsAtOnce;

    let remoteItems = [];

    return new Promise(function (resolve, reject) {
      self.syncWithRemoteGetItems(remoteDbTableName, processRecordsAtOnce, remoteQuery)
        .then((records: any) => {
            remoteItems = records;
            //console.log("REMOTE-ITEMS: ", remoteItems);

            Promise.reduce(syncFunctions, function (accu, syncFunction, index) {
              return new Promise(function (resolve, reject) {
                if (!_.isFunction(self[syncFunction]))
                {
                  console.warn("NO FN(" + syncFunction + ")!!!");
                  resolve();
                  return;
                }

                let syncPromise = self[syncFunction].call(self, remoteItems);

                syncPromise.then(() => {
                  //console.log("FN(" + syncFunction + ") done.");
                  resolve();
                }, (e) => {
                  console.warn("FN(" + syncFunction + ") fail: " + e);
                  return reject(e);
                })

              });
            }, null)
              .then(() => {
                  //console.log("Promise Reduce done.");
                  resolve();
                }, (e) => {
                  return reject(new Error("syncWithRemote error: " + e));
                }
              );
          }, (e) => {
            return reject(new Error("Get Remote Items error: " + e));
          }
        );
    });
  }

  /**
   * @todo: use self.sync_configuration
   * [ called by localDocumentProvider.syncWithRemote ]
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

    //keep only items that are not deleted
    itemsToCheck = _.filter(itemsToCheck, {deleted: '0'});
    //console.log("FILTERED ITEMS: " + _.size(itemsToCheck));

    return new Promise(function (resolve, reject) {
      remoteIdArray = _.map(itemsToCheck, 'id');
      //console.log("REMOTE ID ARRAY: ", remoteIdArray);

      self.findDocuments({
        selector: {id: {'$in': remoteIdArray}},
        fields: ['id'],
      }).then((docs) => {

        docs = !_.isUndefined(docs.docs) ? docs.docs : [];
        //console.log("Local documents: ", docs);

        localIdArray = _.map(docs, 'id');
        //console.log("LOCAL ID ARRAY: ", localIdArray);

        missingIdArray = _.difference(remoteIdArray, localIdArray);

        if (!_.size(missingIdArray))
        {
          //console.log("No new records.");
          resolve();
          return;
        }

        //console.log("MISSING ID ARRAY: ", missingIdArray);
        self.offlineCapableRestService.getEntries(dbTableName, {
          select_fields: fixedModuleFields,
          ids: missingIdArray
        }).then((res) => {
            let records = !_.isUndefined(res) && !_.isUndefined(res.entry_list) ? res.entry_list : [];

            let documents = [];
            let model;
            _.each(records, function (record) {
              model = new self.underlying_model(record);
              documents.push(model);
            });

            if (!_.size(documents))
            {
              //console.log("No new documents to register.");
              resolve();
              return;
            }

            console.log("NEW DOCS : #", _.size(documents));
            //console.log("NEW DOCS TO REGISTER: ", documents);

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

    //keep only items that are not deleted
    itemsToCheck = _.filter(itemsToCheck, {deleted: '0'});
    //console.log("FILTERED ITEMS: " + _.size(itemsToCheck));

    return new Promise(function (resolve, reject) {
      remoteIdArray = _.map(itemsToCheck, 'id');
      //console.log("REMOTE ID ARRAY: ", remoteIdArray);
      //console.log("Remote documents: ", itemsToCheck);

      self.findDocuments({
        selector: {id: {'$in': remoteIdArray}},
        fields: ['id', 'date_modified'],
      }).then((localDocs) => {

        localDocs = !_.isUndefined(localDocs.docs) ? localDocs.docs : [];

        //create date objects
        _.each(localDocs, (localDoc) => {
          localDoc.date_modified = moment(localDoc.date_modified);
        });
        //console.log("Local documents: ", localDocs);

        let remoteDoc;
        _.each(localDocs, (localDoc) => {
          remoteDoc = _.find(itemsToCheck, {id: localDoc.id});
          if(remoteDoc)
          {
            if(remoteDoc.date_modified.isAfter(localDoc.date_modified))
            {
              updateIdArray.push(localDoc.id);
            }
          }
        });

        if (!_.size(updateIdArray))
        {
          //console.log("No records to update.");
          resolve();
          return;
        }

        //console.log("Records to update: ", updateIdArray);

        self.offlineCapableRestService.getEntries(dbTableName, {
          select_fields: fixedModuleFields,
          ids: updateIdArray
        }).then((res) => {
          let records = !_.isUndefined(res) && !_.isUndefined(res.entry_list) ? res.entry_list : [];

          let documents = [];
          let model;
          _.each(records, function (record) {
            model = new self.underlying_model(record);
            documents.push(model);
          });

          if (!_.size(documents))
          {
            //console.log("No changed documents to update.");
            resolve();
            return;
          }
          console.log("CHANGED DOCS : #", _.size(documents));
          //console.log("CHANGED DOCS TO UPDATE: ", documents);

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
   * @todo: use self.sync_configuration
   * [ called by localDocumentProvider.syncWithRemote ]
   *
   * @param {any} itemsToCheck
   * @returns {Promise<any>}
   */
  public syncDownDeleted(itemsToCheck: any = []): Promise<any>
  {
    let self = this;
    let dbTableName = self.underlying_model.DB_TABLE_NAME;

    //keep only items that are deleted
    itemsToCheck = _.filter(itemsToCheck, {deleted: '1'});
    //console.log("FILTERED (DELETED)ITEMS: " + _.size(itemsToCheck));

    return new Promise(function (resolve, reject) {
      //console.log("syncDownDeleted");
      resolve();
    });
  }

  /**
   * Returns number of NEW items synced DOWN from remote
   * [ called by localDocumentProvider.syncWithRemote ]
   *
   * @param {string} dbTableName
   * @param {number} [itemLimit]
   * @param {string} [query]
   * @returns {Promise<any>}
   */
  public syncWithRemoteGetItems(dbTableName: string, itemLimit: number = 0, query: string = ""): Promise<any>
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
            //console.log("SYNC OFFSET[" + configCheckKey + "]: " + syncOffset);

            //console.log("LOADING FROM[" + dbTableName + "] WITH QUERY: " + query);

            self.offlineCapableRestService.getEntryList(dbTableName, {
              select_fields: ['id', 'date_entered', 'date_modified', 'deleted'],
              order_by: 'date_entered ASC',
              deleted: '1',
              query: query,
              offset: syncOffset,
              max_results: itemLimit
            }).then((res) => {
                let records = !_.isUndefined(res.entry_list) ? res.entry_list : [];

                //create date objects
                _.each(records, (record) => {
                  record.date_entered = moment(record.date_entered);
                  record.date_modified = moment(record.date_modified);
                });

                //console.log("RECORDS: ", records);
                let newSyncOffset = _.size(records) == itemLimit ? syncOffset + itemLimit : 0;
                self.configurationService.setConfig(configCheckKey, newSyncOffset, false, true)
                  .then(() => {
                    //console.log("CFGKEY written");
                  }, (e) => {
                    return reject(new Error("Set Config item error: " + e));
                  });

                resolve(records);
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
      let registeredDocument: any;
      self.getDocumentById(key).then((registeredDocument: any) => {
        //console.log("Docs found:", key, registeredDocument);
        doUpdate = document.isNewer(moment(registeredDocument.date_modified).toDate());
        if (doUpdate || forceUpdate)
        {
          document._id = registeredDocument._id;
          document._rev = registeredDocument._rev;
          self.db.put(document).then((res) => {
            //console.log("Doc updated:", key, document);
            resolve(key);
          });
        } else
        {
          //console.log("Skipping doc update:", key, document);
          resolve(key);
        }

      }).catch((e) => {
        document._id = key;
        self.db.put(document).then((res) => {
          //console.log("Doc registered:", key, document);
          resolve(key);
        }).catch((e) => {
          console.error("Store Document Error - document", document);
          console.error("Store Document Error - forceUpdate", forceUpdate);
          console.error("Store Document Error - findById", findById);
          console.error(e);
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
    return new Promise(function (resolve, reject) {
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
   * @returns @returns {Promise<any>}
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
            throw new Error("Checkin was not found!");
          }
          if (_.size(res.docs) > 1)
          {
            throw new Error("Multiple checkins were found!");
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
   * @todo: this should be moved out from here to some utility class
   *
   * @param {any} data
   * @param {function} condition
   * @param {function} action
   * @returns @returns {Promise<any>}
   */
  protected promiseWhile(data, condition, action): Promise<any>
  {
    let whilst = (data): Promise<any> => {
      return condition(data)
        ? action(data).then(whilst)
        : Promise.resolve(data);
    };

    return whilst(data);
  };

  /**
   *
   * @returns {Promise<any>}
   */
  public destroyDatabase(): Promise<any>
  {
    let self = this;
    return new Promise(function (resolve, reject) {
      self.db.destroy().then((res) => {
        console.log("DB destroyed: " + self.database_name, res);
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

    return new Promise(function (resolve, reject) {
      console.log("Creating DB: " + self.database_name);
      self.db = new PouchDB(self.database_name, self.database_options);


      let changes = self.db.changes({
        since: 'now',
        live: true,
        include_docs: false
      }).on('change', function (change) {
        //console.log('DB CHANGE: ', change);
        let data = {
          db: self.database_name,
          id: change.id
        };
        self.databaseChangeSubject.next(data);
        //put some observable here and trigger change
      }).on('complete', function (info) {
        //console.log('DB COMPLETE: ', info);
        self.databaseChangeSubject.complete();
      }).on('error', function (err) {
        console.error('DB ERROR: ' + err);
        self.databaseChangeSubject.error(err);
      });


      //add index for 'id'
      self.database_indices.push(
        {
          name: 'idx_id',
          fields: ['id']
        }
      );

      let indexCreationPromises = [];
      _.each(self.database_indices, function (indexObject) {
        //console.log("Creating INDEX["+self.database_name+"]: ", indexObject);
        indexCreationPromises.push(self.db.createIndex({index: indexObject}));
      });

      Promise.all(indexCreationPromises).then((res) => {
        //console.log("INDEXES OK: ", res);
        resolve();
      });
    });
  }
}
