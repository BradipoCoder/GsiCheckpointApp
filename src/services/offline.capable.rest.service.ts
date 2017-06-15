/**
 * Created by jack on 15/06/17.
 */
/**
 * The responsibility of this class is to:
 * a) keep hashed user passwords so that they can be identified when off-line
 * b) be a bucket for unsyncronized data to be pushed to remote when off-line
 * c) be a bucket for important remote data necessary for app when off-line
 * d) control when connection is available and empty buckets
 *
 */
import {Injectable} from '@angular/core';
import {Storage} from '@ionic/storage';
import {RestService} from "./rest.service";

@Injectable()
export class OfflineCapableRestService extends RestService
{
  private is_network_connected: boolean = false;

  private readonly prefix: string = "d_";


  constructor(private storage: Storage)
  {
    super();
  }




  /**
   * @param {string} rest_api_url
   * @param {string} rest_api_version
   */
  initialize(rest_api_url: string, rest_api_version: string): void
  {
    super.initialize(rest_api_url, rest_api_version);
  }
}
