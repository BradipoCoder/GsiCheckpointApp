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
import md5 from '../../node_modules/blueimp-md5';
import * as moment from 'moment';


@Injectable()
export class RemoteDataService
{
  public static readonly CHECKPOINT_TYPE_IN: string = "IN";
  public static readonly CHECKPOINT_TYPE_OUT: string = "OUT";
  public static readonly CHECKPOINT_TYPE_CHK: string = "CHK";


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

  //-------------------------------------------------------------------------------------------------------REST API DATA

  /**
   * Create a relationship between records of two modules
   * Proxy method
   *
   * @param {String}      module_name
   * @param {String}      id
   * @param {String}      link_field_name
   * @param {Array}       related_ids
   * @param {Object}      parameters
   *
   * @return {Promise}
   */
  private setRelationship(module_name: string, id: string, link_field_name: string, related_ids: any, parameters = {}): Promise<any>
  {
    let self = this;
    return new Promise(function (resolve, reject)
    {
      self.restService.setRelationship(module_name, id, link_field_name, related_ids, parameters)
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
   * @param {string|boolean} id
   * @param {object} [parameters]
   * @returns {Promise<any>}
   */
  private setEntry(module_name: string, id: string | boolean, parameters = {}): Promise<any>
  {
    let self = this;
    return new Promise(function (resolve, reject)
    {
      self.restService.setEntry(module_name, id, parameters)
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
  private getEntries(module_name: string, parameters = {}): Promise<any>
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
  private getEntryList(module_name: string, parameters = {}): Promise<any>
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
   * Register a new CHECKIN for current user at current time by matching the code passed of the checkpoints
   *
   * @param {string} code
   * @returns {Promise<string>}
   */
  public storeNewCheckin(code): Promise<any>
  {
    let self = this;
    let newCheckinId = "";
    let relativeCheckpoint = self.getCheckpoint({code: code});
    //console.log("RC: " + JSON.stringify(relativeCheckpoint));

    return new Promise(function (resolve, reject)
    {
      let checkPointId = relativeCheckpoint.id;
      let checkinDate = moment().format('YYYY-MM-DD HH:mm:ss');
      let checkinUserId = self.userService.getUserData("id");
      let checkinDescription = '';

      let param = {
        description: checkinDescription,
        checkin_date: checkinDate,
        user_id_c: checkinUserId,
        assigned_user_id: checkinUserId,
        mkt_checkpoint_id_c: checkPointId
      };

      //@todo: find something more meaningful for the name of checkins
      _.set(param, "name", md5(JSON.stringify(param)));

      self.setEntry('mkt_Checkin', false, param).then((res) =>
      {
        if (_.isUndefined(res.id) || _.isEmpty(res.id))
        {
          throw new Error("Salvataggio Checkin fallito!");
        }
        newCheckinId = res.id;
        //console.log("CHKIN: " + JSON.stringify(res));
        if (_.includes([RemoteDataService.CHECKPOINT_TYPE_IN, RemoteDataService.CHECKPOINT_TYPE_OUT], relativeCheckpoint.type))
        {
          self.last_operation_type = relativeCheckpoint.type;
        }

        resolve(newCheckinId);
      }).catch((e) =>
      {
        console.log("CHECKIN REGISTRATION ERROR: " + JSON.stringify(e));
        reject(e);
      });
    });
  }

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
            let checkpoint: any = self.getCheckpoint({id: checkin.mkt_checkpoint_id_c});
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

      if (!self.userService.isAuthenticated())
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
