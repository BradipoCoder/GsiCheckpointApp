/**
 * Configuration Service
 *
 *  @todo: configure to:
 *  1) on init load config object into memory
 *  2) make get/set become synchronous methods on in-memory object
 *  3) on set trigger db.put (with optional wait-for-storage param/option)
 */

/** CORE */
import {Injectable} from '@angular/core';
/** OTHER */
import PouchDB from "pouchdb";
import _ from "lodash";
import Rx from "rxjs/Rx";
import {Subject} from "rxjs/Subject";
import {Observable} from "rxjs/Observable";

@Injectable()
export class ConfigurationService
{
  private db: any;

  private readonly UNLOCK_CODE: string = "MKT";

  private is_unlocked: boolean = false;

  default_config: any = {
    crm_url: 'http://gsi.crm.mekit.it'
    , api_version: 'v4_1'
    , crm_username: ''
    , crm_password: ''
    , log_level: 'NONE'
  };

  private databaseChangeSubject: Subject<any> = new Rx.Subject();
  public databaseChangeObservable: Observable<any> = Rx.Observable.create(e => this.databaseChangeSubject = e);


  public unlockWithCode(code: string): boolean
  {
    this.is_unlocked = (code === this.UNLOCK_CODE);
    return this.is_unlocked;
  }

  /**
   *
   * @returns {boolean}
   */
  public isUnlocked(): boolean
  {
    return this.is_unlocked;
  }

  /**
   * Return the entire configuration object
   *
   * @returns {Promise<any>}
   */
  public getConfigObject(): Promise<any>
  {
    let self = this;
    let answer = {};

    return new Promise(function (resolve, reject)
    {
      self.db.allDocs({include_docs: true, descending: true})
        .then((res) =>
        {
          _.each(res.rows, function (row)
          {
            let key = row.key;
            answer[key] = row.doc.cfg_value;
          });
          resolve(answer);
        })
        .catch((e) =>
        {
          reject(e);
        });
    });
  };

  /**
   * Return the value of a single configuration item
   *
   * @param {string} key
   * @param {any} defaultValue
   * @returns {Promise<any>}
   */
  public getConfig(key, defaultValue = null): Promise<any>
  {
    let answer = defaultValue;
    let self = this;

    return new Promise(function (resolve)
    {
      self.db.get(key).then((doc) =>
      {
        if (!_.isUndefined(doc.cfg_value))
        {
          answer = doc.cfg_value;
        }
        resolve(answer);
      }).catch(() =>
      {
        resolve(answer);
      });
    });
  };

  /**
   *
   * @param {any} configs
   * @param {boolean} [skip_if_exists]
   * @param {boolean} [override_lock]
   * @returns {Promise<any>}
   */
  public setMultipleConfigs(configs:any, skip_if_exists:boolean = false, override_lock:boolean = false): Promise<any>
  {
    let self = this;

    return new Promise(function (resolve, reject)
    {

      let setPromises = [];
      _.each(configs, function (v, k)
      {
        setPromises.push(self.setConfig(k, v, skip_if_exists, override_lock));
      });

      Promise.all(setPromises).then(() =>
      {
        resolve();
      }, (e) =>
      {
        reject(e);
      });
    });
  }

  /**
   * Set the value of a single configuration item
   *
   * @param {string} key
   * @param {any} value
   * @param {boolean} [skip_if_exists]
   * @param {boolean} [override_lock]
   * @returns {Promise<any>}
   */
  public setConfig(key:string, value:any, skip_if_exists:boolean = false, override_lock:boolean = false): Promise<any>
  {
    let self = this;

    return new Promise(function (resolve, reject)
    {
      if (!override_lock && !self.isUnlocked())
      {
        return reject(new Error("Configuration service is locked! Unlock first."));
      }

      if (_.isNil(value) && _.has(self.default_config,key))
      {
        value = _.get(self.default_config, key);
      }

      self.db.get(key).then((doc) =>
      {
        if (skip_if_exists || (!_.isUndefined(doc.cfg_value) && doc.cfg_value == value))
        {
          resolve(value);
        } else
        {
          self.db.put({
            _id: key,
            _rev: doc._rev,
            cfg_value: value
          }).then((res) =>
          {
            if (!_.isUndefined(res.ok) && res.ok)
            {
              resolve(value);
            } else
            {
              return reject(new Error("Configuration service put operation failed."));
            }
          }).catch((e) =>
          {
            return reject(e);
          });
        }
      }).catch(() =>
      {
        //doc is not there - make a new one
        self.db.put({
          _id: key,
          cfg_value: value
        }).then((res) =>
        {
          if (!_.isUndefined(res.ok) && res.ok)
          {
            resolve(value);
          } else
          {
            return reject(new Error("Configuration service put operation failed."));
          }
        }).catch((e) =>
        {
          return reject(e);
        });
      });
    });
  };

  /**
   * Makes sure all keys in the default_config are present in the storage.
   *
   * @returns {Promise}
   */
  public initialize(): Promise<any>
  {
    let self = this;

    return new Promise(function (resolve, reject)
    {
      self.db = new PouchDB('configuration', {auto_compaction: true, revs_limit: 10});

      self.db.changes({
        since: 'now',
        live: true,
        include_docs: false
      }).on('change', function (change) {
        self.databaseChangeSubject.next(change);
      }).on('error', function (err) {
        console.error('CONFIGURATION DB ERROR: ' + err);
        self.databaseChangeSubject.error(err);
      });


      self.setMultipleConfigs(self.default_config, true, true).then(() => {
        resolve();
      }, (e) => {
        reject(e);
      });

    });
  }
}

