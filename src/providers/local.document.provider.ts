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

PouchDB.plugin(PouchDBFind);
//PouchDB.debug.enable('pouchdb:find');
PouchDB.debug.disable('pouchdb:find');


@Injectable()
export class LocalDocumentProvider
{
  protected database_name: string;
  protected database_options: any = {};

  protected database_indices: any = [];

  //@todo: remove this!!! MOVED TO MODEL!
  protected remote_table_name: string;

  protected db: any;

  protected module_fields: any = [];

  constructor(protected configurationService: ConfigurationService,
              protected offlineCapableRestService: OfflineCapableRestService)
  {
  }

  /**
   *
   * @returns {Promise<any>}
   */
  public syncWithRemote(): Promise<any>
  {
    let self = this;

    let functions = [
      'syncWithRemoteDownNew',
      'syncWithRemoteDownChanged',
      /*'syncWithRemoteDownDeleted'*/
    ];

    let maxItemsToSync = 250;

    return Promise.reduce(functions, function(accu, fn, index)
    {
      return new Promise(function (resolve, reject) {
        if (_.isFunction(self[fn]))
        {
          let promise = self[fn].call(self, maxItemsToSync);
          promise.then((syncedItems:number) => {
            maxItemsToSync = (syncedItems <= maxItemsToSync) ? maxItemsToSync - syncedItems : 0;

            console.log("FN("+fn+") synced: " + syncedItems);
            resolve();
          }, (e) => {
            console.warn("FN("+fn+") sync failed: " + e);
            return reject(e);
          })
        } else
        {
          console.log("FN("+fn+") NOPE!");
          resolve();
        }
      });
    }, null);
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

    return new Promise(function (resolve, reject)
    {
      let registeredDocument: any;
      self.getDocumentById(key).then((registeredDocument: any) =>
      {
        //console.log("Docs found:", key, registeredDocument);
        doUpdate = document.isNewer(moment(registeredDocument.date_modified).toDate());
        if (doUpdate || forceUpdate)
        {
          document._id = registeredDocument._id;
          document._rev = registeredDocument._rev;
          self.db.put(document).then((res) =>
          {
            //console.log("Doc updated:", key, document);
            resolve(key);
          });
        } else
        {
          //console.log("Skipping doc update:", key, document);
          resolve(key);
        }

      }).catch((e) =>
      {
        document._id = key;
        self.db.put(document).then((res) =>
        {
          //console.log("Doc registered:", key, document);
          resolve(key);
        }).catch((e) =>
        {
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
    return new Promise(function (resolve, reject)
    {
      let promises = [];
      _.each(documents, function (document)
      {
        promises.push(self.storeDocument(document, forceUpdate));
      });
      Promise.all(promises).then(() =>
      {
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
    return new Promise(function (resolve, reject)
    {
      let isTemporaryId = _.startsWith(id, CrmDataModel.TEMPORARY_ID_PREFIX);
      if (isTemporaryId)
      {
        self.db.get(id).then((doc) =>
        {
          resolve(doc);
        }).catch((e) =>
        {
          reject(e);
        });
      } else
      {
        let options = {selector: {id: id}};
        self.findDocuments(options).then((res) =>
        {
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
        }).catch((e) =>
        {
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
    let whilst = (data): Promise<any> =>
    {
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
    return new Promise(function (resolve, reject)
    {
      self.db.destroy().then((res) =>
      {
        console.log("DB destroyed: " + self.database_name, res);
        resolve();
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
  protected setupDatabase(): Promise<any>
  {
    let self = this;

    return new Promise(function (resolve, reject)
    {
      console.log("Creating DB: " + self.database_name);
      self.db = new PouchDB(self.database_name, self.database_options);


      let changes = self.db.changes({
        since: 'now',
        live: true,
        include_docs:true
      }).on('change', function(change) {
        console.log('DB CHANGE: ', change);
        //put some observable here and trigger change
      }).on('complete', function(info) {
        console.log('DB COMPLETE: ', info);
      }).on('error', function (err) {
        console.error(err);
      });

      //add index for 'id'
      self.database_indices.push(
        {
          name: 'idx_id',
          fields: ['id']
        }
      );

      let indexCreationPromises = [];
      _.each(self.database_indices, function (indexObject)
      {
        //console.log("Creating INDEX["+self.database_name+"]: ", indexObject);
        indexCreationPromises.push(self.db.createIndex({index: indexObject}));
      });

      Promise.all(indexCreationPromises).then((res) =>
      {
        //console.log("INDEXES OK: ", res);
        resolve();
      });
    });
  }
}
