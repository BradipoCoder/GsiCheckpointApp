/**
 * The responsability of this class is to:
 * a) keep hashed user passwords so that they can be identified when off-line
 * b) be a bucket for unsyncronized data to be pushed to remote when off-line
 * c) be a bucket for important remote data necessary for app when off-line
 * d) control when connection is available and empty buckets
 *
 */
import {Injectable} from '@angular/core';
import {Platform} from "ionic-angular";
import {Storage} from '@ionic/storage';
import {Network} from '@ionic-native/network';
import {RestService} from './rest.service';
import _ from "lodash";

@Injectable()
export class RemoteDataService
{
  private readonly prefix: string = "d_";

  private is_network_connected: boolean = false;

  constructor(private restService: RestService
    , private storage: Storage
    , private network: Network
    , private platform:Platform )
  {
  }




  /**
   * Provide a registered user hash (hashed password)
   *
   * @param {string} user
   * @returns {Promise<any>}
   */
  getRegisteredUserHash(user: string): Promise<any>
  {
    return this.storage.get(this.getUserHashKey(user));
  };

  /**
   * Registers a user hash (hashed password)
   *
   * @param {string} user
   * @param {string} hash
   * @returns {Promise<any>}
   */
  registerUserHash(user: string, hash: string): Promise<any>
  {
    let key = this.getUserHashKey(user);
    console.log("Registering user hash(" + key + "): " + hash);
    return this.storage.set(key, hash);
  };

  /**
   *
   * @param {string} user
   * @returns {string}
   */
  private getUserHashKey(user: string): string
  {
    return this.prefix + '_userhash__' + user;
  }


  /**
   *
   * @returns {boolean}
   */
  public isNetworkConnected():boolean
  {
    return this.is_network_connected;
  }

  /**
   * Makes sure all keys in the default_config are present in the storage
   * (Should be called on application initialization)
   *
   * @returns {Promise}
   */
  public initialize(): Promise<any>
  {
    let self = this;

    return new Promise(function (resolve, reject)
    {
      //set network state and listen to changes
      if(!self.platform.is("core"))
      {
        self.network.onConnect().subscribe(() => {
          self.is_network_connected = true;
        });

        self.network.onDisconnect().subscribe(() => {
          console.log('Network disconnected!');
          self.is_network_connected = false;
        });

        // The `type` property will return one of the following connection types: `unknown`, `ethernet`, `wifi`, `2g`, `3g`, `4g`, `cellular`, `none`
        self.is_network_connected = (self.network.type != 'none');

      } else {
        self.is_network_connected = true;
      }

      resolve();
    });
  }

}
