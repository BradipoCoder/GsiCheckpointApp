/**
 * The responsibility of this class is to:
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
import {UserService} from './user.service';
import _ from "lodash";

@Injectable()
export class RemoteDataService
{
  public static readonly CHECKPOINT_TYPE_IN : string    = "IN";
  public static readonly CHECKPOINT_TYPE_OUT : string   = "OUT";
  public static readonly CHECKPOINT_TYPE_CHK : string   = "CHK";


  private last_operation_type: string = RemoteDataService.CHECKPOINT_TYPE_OUT;

  private is_network_connected: boolean = false;

  private readonly prefix: string = "d_";

  private CHECKPOINS: any = [];


  constructor(private restService: RestService
    , private userService: UserService
    , private storage: Storage
    , private network: Network
    , private platform: Platform)
  {
  }

  /**
   *
   * @param {string} module_name
   * @param {object} [parameters]
   * @returns {Promise<any>}
   */
  getEntries(module_name: string, parameters = {}): Promise<any>
  {
    let self = this;
    return new Promise(function (resolve, reject)
    {
      self.restService.getEntries(module_name, parameters)
        .then((res) =>
        {
          //do something with res
          resolve(res);
        })
        .catch((e) =>
        {
          reject(e);
        });
    });
  }

  /**
   *
   * @param {string} module_name
   * @param {object} [parameters]
   * @returns {Promise<any>}
   */
  getEntryList(module_name: string, parameters = {}): Promise<any>
  {
    let self = this;
    return new Promise(function (resolve, reject)
    {
      self.restService.getEntryList(module_name, parameters)
        .then((res) =>
        {
          //do something with res
          resolve(res);
        })
        .catch((e) =>
        {
          reject(e);
        });
    });
  }




  //---------------------------------------------------------------------------------------------------------CHECKKPOINT

  /**
   *
   * @param {any} filter
   * @returns {array}
   */
  public getCheckpoints(filter = {}): any
  {
    return _.filter(this.CHECKPOINS, filter);
  }

  /**
   *
   * @param {any} filter
   * @returns {any}
   */
  public getCheckpoint(filter = {}): any
  {
    return _.find(this.CHECKPOINS, filter);
  }

  /**
   *
   * @returns {Promise<any>}
   */
  private loadCheckpoints(): Promise<any>
  {
    let self = this;

    return new Promise(function (resolve, reject)
    {
      self.getEntryList('mkt_Checkpoint', {
        select_fields: ["id", "type", "code", "name", "description", "account_id_c", "account_reference"],
        order_by: 'account_id_c ASC',
      })
        .then((res) =>
        {
          self.CHECKPOINS = res.entry_list;
          console.log("Checkpoints loaded: " + _.size(self.CHECKPOINS));
          resolve();
        })
        .catch((e) =>
        {
          reject(e);
        });
    });
  }

  //-------------------------------------------------------------------------------------------------------------CHECKIN
  /**
   *
   * @returns {Promise<any>}
   */
  private findLastInOutOperation(): Promise<any>
  {
    let self = this;
    let lastOperation = RemoteDataService.CHECKPOINT_TYPE_OUT;
    let current_user_id = self.userService.getUserData('id');

    return new Promise(function (resolve, reject)
    {
      self.getEntryList('mkt_Checkin', {
        select_fields: ["id", "mkt_checkpoint_id_c"],
        query: 'user_id_c = ' + current_user_id,
        order_by: 'checkin_date DESC',
        max_results: 50
      })
        .then((res) =>
        {
          _.each(res.entry_list, function (checkin)
          {
            //let checkpoint: any = _.find(self.CHECKPOINS, {id: checkin.mkt_checkpoint_id_c});
            let checkpoint:any = self.getCheckpoint({id: checkin.mkt_checkpoint_id_c});
            if (!_.isUndefined(checkpoint))
            {
              if (_.includes([RemoteDataService.CHECKPOINT_TYPE_IN, RemoteDataService.CHECKPOINT_TYPE_OUT], checkpoint.type))
              {
                lastOperation = checkpoint.type;
                return false;//equivalent of break
              }
            }
          });

          resolve(lastOperation);
        })
        .catch((e) =>
        {
          reject(e);
        });
    });
  }

  //----------------------------------------------------------------------------------------------SIMPLE GETTERS/SETTERS
  /**
   *
   * @returns {boolean}
   */
  public getLastOperationType(): string
  {
    return this.last_operation_type;
  }

  /**
   *
   * @returns {boolean}
   */
  public isNetworkConnected(): boolean
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
      if (!self.platform.is("core"))
      {
        self.network.onConnect().subscribe(() =>
        {
          self.is_network_connected = true;
        });

        self.network.onDisconnect().subscribe(() =>
        {
          console.log('Network disconnected!');
          self.is_network_connected = false;
        });

        // The `type` property will return one of the following connection types: `unknown`, `ethernet`, `wifi`, `2g`, `3g`, `4g`, `cellular`, `none`
        self.is_network_connected = (self.network.type != 'none');

      } else
      {
        self.is_network_connected = true;
      }

      if(!self.userService.isAuthenticated())
      {
        console.log("UDS - not authenticated");
        return resolve();
      }

      self.loadCheckpoints().then(() =>
      {
        //console.log("CHK: " + JSON.stringify(self.CHECKPOINS));
        return self.findLastInOutOperation();
      }).then((lastOperationType) =>
      {
        self.last_operation_type = lastOperationType;
        console.log("LAST CHECKIN TYPE: " + lastOperationType);


        resolve();
      }).catch((e) =>
      {
        reject(e);
      });


    });
  }
}
