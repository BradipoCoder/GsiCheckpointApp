/**
 * Created by jack on 05/06/17.
 */
import {Injectable} from '@angular/core';

import _ from "lodash";
import SugarCrmJsRestConsumer from "../../node_modules/sugarcrm-js-rest-consumer";


@Injectable()
export class RestService
{
  /* @type SugarCrmJsRestConsumer */
  private sugar: any;

  /*
   console.log("TEST(has lib?): " + !_.isUndefined(SugarCrmJsRestConsumer));



   this.sugar = new SugarCrmJsRestConsumer("http://gsi.crm.mekit.it", "v4_1");

   let cfg = this.sugar.getConfig();
   console.log("TEST(config):" + JSON.stringify(cfg));

   this.sugar.login("admin", "admin")
   .then(function(response)
   {
   console.log("TEST(login):" + JSON.stringify(response));
   })
   .catch(function(error)
   {
   console.error(error);
   });
   */


  /**
   *
   * @returns {Promise<any>}
   */
  logout():Promise<any>
  {
    return this.sugar.logout();
  }

  /**
   *
   * @param {string} username
   * @param {string} password
   * @returns {Promise<any>}
   */
  login(username: string, password: string):Promise<any>
  {
    return this.sugar.login(username, password);
  }

  /**
   *
   * @returns {Promise<any>}
   */
  getUserId():Promise<any>
  {
    return this.sugar.getUserId();
  }

  /**
   *
   * @returns {Promise<any>}
   */
  isAuthenticated():Promise<any>
  {
    return this.sugar.isAuthenticated();
  }

  /**
   *
   * @param {string} rest_api_url
   * @param {string} rest_api_version
   */
  initialize(rest_api_url: string, rest_api_version: string): void
  {
    this.sugar = new SugarCrmJsRestConsumer(rest_api_url, rest_api_version);
  }
}
