/**
 * Rest Data Provider
 */
import {Injectable} from '@angular/core';
import {OfflineCapableRestService} from '../services/offline.capable.rest.service';
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
export class RestDataProvider
{
  protected database_name: string;
  protected database_options: any = {};
  /*adapter: 'websql', revs_limit: 50*/
  protected database_indices: any = [];

  protected remote_table_name: string;

  protected db: any;

  protected module_fields: any = [];

  constructor(protected offlineCapableRestService: OfflineCapableRestService)
  {
  }

  /**
   *
   * @param {CrmDataModel} document
   * @param {Boolean} [forceUpdate]
   * @returns {Promise<any>}
   */
  protected storeDocument(document: CrmDataModel, forceUpdate: boolean = false): Promise<any>
  {
    let self = this;
    let key: string = document.id;
    let doUpdate = false;

    return new Promise(function (resolve, reject)
    {
      self.db.get(key).then((registeredDocument: any) =>
      {
        doUpdate = document.isNewer(moment(registeredDocument.date_modified).toDate());
        if (doUpdate || forceUpdate)
        {
          document._id = registeredDocument._id;
          document._rev = registeredDocument._rev;
          self.db.put(document).then((res) =>
          {
            //console.log("Doc updated:", key);
            resolve();
          });
        } else
        {
          //console.log("Skipping doc update:", key);
          resolve();
        }
      }).catch((e) =>
      {
        document._id = key;
        self.db.put(document).then((res) =>
        {
          //console.log("Doc registered:", key);
          resolve();
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
  promiseWhile(data, condition, action): Promise<any>
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
