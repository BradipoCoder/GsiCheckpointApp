/**
 * Created by jack on 05/06/17.
 */
import {Injectable} from '@angular/core';
import {Storage} from '@ionic/storage';
import _ from "lodash";

@Injectable()
export class ConfigurationService
{
  private readonly UNLOCK_CODE: string = "GSI";

  private readonly prefix: string = "cfg_";

  private is_unlocked:boolean = false;


  default_config: any = {
    crm_url: 'http://gsi.crm.mekit.it'
    , api_version: 'v4_1'
    , crm_sync_user: ''
    , crm_sync_user_password: ''
  };

  constructor(private storage: Storage)
  {
  }


  unlockWithCode(code:string):boolean
  {
    this.is_unlocked = (code === this.UNLOCK_CODE);
    return this.is_unlocked;
  }

  /**
   *
   * @returns {boolean}
   */
  isUnlocked():boolean
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
      self.storage.forEach(function (value, key)
      {
        if (_.startsWith(key, self.prefix))
        {
          let configKey = _.replace(key, self.prefix, "");
          _.set(answer, configKey, value);
        }
      }).then(() =>
      {
        resolve(answer);
      }).catch((e) =>
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
    let configKey = this.prefix + key;
    return this.storage.get(configKey);
  };

  /**
   * Set the value of a single configuration item
   *
   * @param {string} key
   * @param {any} value
   * @returns {Promise<any>}
   */
  setConfig(key, value): Promise<any>
  {
    if(!this.isUnlocked())
    {
      throw new Error("Configuration service is locked! Unlock first.");
    }

    if(_.isNull(value) || _.isEmpty(value))
    {
      value = _.get(this.default_config, key);
    }
    let configKey = this.prefix + key;
    return this.storage.set(configKey, value);
  };

  /**
   * Makes sure all keys in the default_config are present in the storage
   * (Should be called on application initialization)
   *
   * @returns {Promise}
   */
  initialize(): Promise<any>
  {
    let self = this;

    return new Promise(function (resolve, reject)
    {
      self.getConfigObject().then((config) =>
      {
        config = _.defaults(config, self.default_config);
        self.is_unlocked = true;
        let setPromises = [];
        _.each(config, function (v, k)
        {
          setPromises.push(self.setConfig(k, v));
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
      }).catch((e) =>
      {
        self.is_unlocked = false;
        reject(e);
      });
    });
  }
}
