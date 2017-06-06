/**
 * Created by jack on 05/06/17.
 */
import {Injectable} from '@angular/core';
import {Storage} from '@ionic/storage';
import _ from "lodash";

@Injectable()
export class ConfigurationService
{
  prefix: string = "cfg_";

  //@todo: do NOT put unlock code into default config/config and provide method to unlock/check edits
  default_config: any = {
    crm_url: 'http://gsi.crm.mekit.it'
    , api_version: 'v4_1'
    , unlock_code: 'GSI'
  };

  constructor(private storage: Storage)
  {
  }


  /**
   * Make sure all keys present in the default_config are present in the storage
   * (Should be called on application initialization)
   *
   * @returns {Promise}
   */
  setUp(): Promise<any>
  {
    let self = this;
    return new Promise(function (resolve, reject)
    {
      self.getConfigObject().then((config) =>
      {
        config = _.defaults(config, self.default_config);
        //console.log("FULL CFG: " + JSON.stringify(config));
        let setPromises = [];
        _.each(config, function (v, k)
        {
          setPromises.push(self.setConfig(k, v));
        });
        Promise.all(setPromises).then(() =>
        {
          resolve();
        });

      }).catch((e) =>
      {
        reject(e);
      });
    });
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
    if(_.isNull(value) || _.isEmpty(value))
    {
      value = _.get(this.default_config, key);
    }
    let configKey = this.prefix + key;
    return this.storage.set(configKey, value);
  };
}
