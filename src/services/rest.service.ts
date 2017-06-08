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


  /**
   *
   * @param {string} module_name
   * @param {string} id
   * @param {any} parameters
   * @returns {Promise<any>}
   */
  getEntry(module_name:string , id:string , parameters = {}):Promise<any>
  {
    return this.sugar.getEntry(module_name, id, parameters);
  }

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
   * @returns {any}
   */
  getAuthenticatedUser():any
  {
    return this.sugar.getAuthenticatedUser();
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
