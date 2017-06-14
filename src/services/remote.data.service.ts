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

import {Checkpoint} from '../models/Checkpoint';
import {Checkin} from '../models/Checkin';

import _ from "lodash";
import md5 from '../../node_modules/blueimp-md5';
import * as moment from 'moment';


@Injectable()
export class RemoteDataService
{
  public static readonly CRM_DATE_FORMAT: string = "YYYY-MM-DD HH:mm:ss";


  private last_operation_type: string = Checkpoint.TYPE_OUT;
  private last_operation_date: string;


  private is_network_connected: boolean = false;

  private readonly prefix: string = "d_";

  private CHECKPOINTS: any = [];

  private CHECKINS: any = [];


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
    return _.filter(this.CHECKPOINTS, filter);
  }

  /**
   *
   * @param {any} filter
   * @returns {any}
   */
  public getCheckpoint(filter = {}): Checkpoint
  {
    return _.find(this.CHECKPOINTS, filter) as Checkpoint;
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
          if (!_.isEmpty(res.entry_list))
          {
            self.CHECKPOINTS = [];
            _.each(res.entry_list, function (cp)
            {
              self.CHECKPOINTS.push(new Checkpoint(cp.id, cp.type, cp.code, cp.name, cp.description, cp.account_id_c, cp.account_reference));
            });
            console.log("Checkpoints loaded: " + _.size(self.CHECKPOINTS));
            //console.log("Checkpoints#1: " + JSON.stringify(self.CHECKPOINTS));
            resolve();
          } else
          {
            throw new Error("No chekpoints available!");
          }
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
   * @param {string} id
   * @param {string} name
   * @param {string} type
   * @param {string} time
   * @param {string} mkt_checkpoint_id_c
   */
  private registerCheckin(id: string, name: string, type: string, time: string, mkt_checkpoint_id_c: string): void
  {
    let currentCheckin = new Checkin(id, name, type, time, mkt_checkpoint_id_c);
    currentCheckin.css_class = "row first";

    //calculate and set duration of last checkin
    let lastCheckin = _.last(this.CHECKINS) as Checkin;
    if (lastCheckin)
    {
      lastCheckin.css_class = "row";

      let lastCheckinDuration = moment(currentCheckin.time).diff(lastCheckin.time, "minutes");
      if (lastCheckinDuration < 60)
      {
        lastCheckin.duration = lastCheckinDuration + " min";
      } else
      {
        let hours = Math.floor(lastCheckinDuration / 60);
        let minutes = lastCheckinDuration - (60 * hours);
        lastCheckin.duration = hours + " " + (hours > 1 ? "ore" : "ora") + " " + minutes + " min";
      }
    }

    this.CHECKINS.push(currentCheckin);
  }

  /**
   * Return checkins in chronologically reversed order - this is for home display
   *
   * @returns {any[]}
   */
  public getAllCheckinsReversed(): any
  {
    return _.reverse(_.clone(this.CHECKINS));
  }

  /**
   *
   * @param {any} filter
   * @returns {any}
   */
  public getCheckins(filter = {}): any
  {
    return _.filter(this.CHECKINS, filter);
  }

  /**
   *
   * @param {any} filter
   * @returns {any}
   */
  public getCheckin(filter = {}): Checkin
  {
    return _.find(this.CHECKINS, filter) as Checkin;
  }

  /**
   *
   * @returns {any}
   */
  public getLastCheckin(): Checkin
  {
    return _.last(this.CHECKINS) as Checkin;
  }

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
      let checkinDate = moment().format(RemoteDataService.CRM_DATE_FORMAT);
      let checkinUserId = self.userService.getUserData("id");
      let checkinName = relativeCheckpoint.name;
      let checkinDescription = '';

      let param = {
        name: checkinName,
        description: checkinDescription,
        checkin_date: checkinDate,
        user_id_c: checkinUserId,
        assigned_user_id: checkinUserId,
        mkt_checkpoint_id_c: checkPointId
      };

      self.setEntry('mkt_Checkin', false, param).then((res) =>
      {
        if (_.isUndefined(res.id) || _.isEmpty(res.id))
        {
          throw new Error("Salvataggio Checkin fallito!");
        }
        //console.log("CHKIN: " + JSON.stringify(res));

        newCheckinId = res.id;

        //register new checkin
        self.registerCheckin(newCheckinId, checkinName, relativeCheckpoint.type, checkinDate, checkPointId);

        //it could have been an IN/OUT checkin
        // if (_.includes([Checkpoint.TYPE_IN, Checkpoint.TYPE_OUT], relativeCheckpoint.type))
        // {
        //   self.last_operation_type = relativeCheckpoint.type;
        // }
        if (relativeCheckpoint.type == Checkpoint.TYPE_OUT)
        {
          self.last_operation_type = relativeCheckpoint.type;
          resolve(newCheckinId);
        } else if (relativeCheckpoint.type == Checkpoint.TYPE_IN)
        {
          self.initialize().then(() => {
            resolve(newCheckinId);
          });
        } else {
          resolve(newCheckinId);
        }

      }).catch((e) =>
      {
        console.log("CHECKIN REGISTRATION ERROR: " + JSON.stringify(e));
        reject(e);
      });
    });
  }

  /**
   * Loads checkins since last IN operation
   *
   *
   * @returns {Promise<any>}
   */
  private loadCheckins(): Promise<any>
  {
    let self = this;
    let current_user_id = self.userService.getUserData('id');

    return new Promise(function (resolve, reject)
    {
      self.getEntryList('mkt_Checkin', {
        select_fields: ["id", "mkt_checkpoint_id_c", "checkin_date", "name"],
        query: 'user_id_c = ' + current_user_id + ' AND checkin_date >= "' + self.last_operation_date + '"',
        order_by: 'checkin_date ASC',
        max_results: 50
      })
        .then((res) =>
        {
          let checkpoint: any, time: string;
          //console.log("CHECKINS: " + JSON.stringify(res));

          if (!_.isEmpty(res.entry_list))
          {
            self.CHECKINS = [];
            _.each(res.entry_list, function (checkin)
            {
              checkpoint = self.getCheckpoint({id: checkin.mkt_checkpoint_id_c});
              if (!_.isUndefined(checkpoint))
              {
                self.registerCheckin(checkin.id, checkin.name, checkpoint.type, checkin.checkin_date, checkin.mkt_checkpoint_id_c);
              }
            });
          }
          resolve();
        })
        .catch((e) =>
        {
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
    let lastOperationType = Checkpoint.TYPE_OUT;
    let lastOperationDate = moment().format(RemoteDataService.CRM_DATE_FORMAT);
    let current_user_id = self.userService.getUserData('id');

    return new Promise(function (resolve, reject)
    {
      self.getEntryList('mkt_Checkin', {
        select_fields: ["id", "mkt_checkpoint_id_c", "checkin_date"],
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
              if (_.includes([Checkpoint.TYPE_IN, Checkpoint.TYPE_OUT], checkpoint.type))
              {
                lastOperationType = checkpoint.type;
                lastOperationDate = checkin.checkin_date;
                return false;//equivalent of break
              }
            }
          });

          self.last_operation_type = lastOperationType;
          self.last_operation_date = lastOperationDate;

          resolve();
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
      //reset
      self.last_operation_type = Checkpoint.TYPE_OUT;
      self.last_operation_date = '';
      self.is_network_connected = false;
      self.CHECKPOINTS = [];
      self.CHECKINS = [];

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
        console.log("RDS - not authenticated.");
        return resolve();
      }

      self.loadCheckpoints().then(() =>
      {
        //console.log("CHK: " + JSON.stringify(self.CHECKPOINTS));
        return self.findLastInOutOperation();
      }).then(() =>
      {
        console.log("LAST CHECKIN TYPE: " + self.last_operation_type + " @: " + self.last_operation_date);
        return self.loadCheckins();
      }).then(() =>
      {
        //READY
        resolve();
      }).catch((e) =>
      {
        reject(e);
      });
    });
  }
}
