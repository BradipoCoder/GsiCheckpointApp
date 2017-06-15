/**
 * Created by jack on 15/06/17.
 */
/**
 * The responsibility of this class is to be a proxy for all different types of Rest Consumer libraries
 * such as (SugarCrmJsRestConsumer) providing means to select which one to use and a unified interface
 * through which to interact with remote end.
 */
import {Injectable} from '@angular/core';
import {RestService} from "./rest.service";
import SugarCrmJsRestConsumer from "../../node_modules/sugarcrm-js-rest-consumer";

@Injectable()
export class OfflineCapableRestService extends RestService
{



  /**
   * @todo: allow to define other consumers
   *
   * @param {string} rest_api_url
   * @param {string} rest_api_version
   */
  initialize(rest_api_url: string, rest_api_version: string): void
  {
    let consumer = new SugarCrmJsRestConsumer(rest_api_url, rest_api_version);
    consumer.setAxiosConfig("timeout" , 15000);
    super._initialize(consumer)
  }
}
