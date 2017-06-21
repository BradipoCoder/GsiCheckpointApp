/**
 * Configuration Service
 */
import {Injectable} from '@angular/core';
import PouchDB from "pouchdb";
import _ from "lodash";

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
  };


  unlockWithCode(code: string): boolean
  {
    this.is_unlocked = (code === this.UNLOCK_CODE);
    return this.is_unlocked;
  }

  /**
   *
   * @returns {boolean}
   */
  isUnlocked(): boolean
  {
    return this.is_unlocked;
  }

  /**
   * Return the entire configuration object
   *
   * @returns {Promise<any>}
   */
  getConfigObject(): Promise<any>
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
   * @returns {Promise<any>}
   */
  getConfig(key): Promise<any>
  {
    let answer = null;
    let self = this;

    return new Promise(function (resolve, reject)
    {
      self.db.get(key).then((doc) =>
      {
        if (!_.isUndefined(doc.cfg_value))
        {
          answer = doc.cfg_value;
        }
        resolve(answer);
      }).catch((e) =>
      {
        reject(e);
      });
    });
  };

  /**
   * Set the value of a single configuration item
   *
   * @param {string} key
   * @param {any} value
   * @param {boolean} skip_if_exists
   * @returns {Promise<any>}
   */
  setConfig(key, value, skip_if_exists = false): Promise<any>
  {
    let self = this;

    return new Promise(function (resolve, reject)
    {
      if (!self.isUnlocked())
      {
        return reject(new Error("Configuration service is locked! Unlock first."));
      }

      if (_.isNull(value) || _.isEmpty(value))
      {
        value = _.get(self.default_config, key);
      }

      self.db.get(key).then((doc) =>
      {
        if (skip_if_exists || doc.cfg_value == value)
        {
          resolve();
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
            reject(e);
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
          reject(e);
        });
      });
    });
  };

  /**
   * Makes sure all keys in the default_config are present in the storage
   *
   * @returns {Promise}
   */
  initialize(): Promise<any>
  {
    let self = this;

    return new Promise(function (resolve, reject)
    {
      self.db = new PouchDB('configuration');

      self.is_unlocked = true;
      let setPromises = [];
      _.each(self.default_config, function (v, k)
      {
        setPromises.push(self.setConfig(k, v, true));
      });

      Promise.all(setPromises).then(() =>
      {
        self.is_unlocked = false;
        resolve();
      }).catch((e) =>
      {
        self.is_unlocked = false;
        reject(e);
      });
    });
  }
}


