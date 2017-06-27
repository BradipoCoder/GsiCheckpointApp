/**
 * A centralized place for data
 *
 */
import {Injectable} from '@angular/core';
import {Platform} from "ionic-angular";
import {Network} from '@ionic-native/network';

/* Services */
import {OfflineCapableRestService} from './offline.capable.rest.service';
import {UserService} from './user.service';

/* Data Models */
import {CrmDataModel} from '../models/crm.data.model';
import {Checkpoint} from '../models/Checkpoint';
import {Checkin} from '../models/Checkin';

/* Data Providers */
import {CheckpointProvider} from "../providers/checkpoint.provider";
import {CheckinProvider} from "../providers/checkin.provider";

/* Utils */
import _ from "lodash";
import * as moment from 'moment';
import {Promise} from '../../node_modules/bluebird'
/*import md5 from '../../node_modules/blueimp-md5';*/

@Injectable()
export class RemoteDataService
{
  private last_operation_type: string = Checkpoint.TYPE_OUT;
  private last_operation_date: string;


  constructor(private offlineCapableRestService: OfflineCapableRestService
    , private userService: UserService
    , private network: Network
    , private platform: Platform
    , private checkpointProvider: CheckpointProvider
    , private checkinProvider: CheckinProvider)
  {
  }

  //-------------------------------------------------------------------------------------------------------REST API DATA
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
      self.offlineCapableRestService.setEntry(module_name, id, parameters)
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
      self.offlineCapableRestService.getEntryList(module_name, parameters)
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


  //----------------------------------------------------------------------------------------------------------CHECKPOINT


  //-------------------------------------------------------------------------------------------------------------CHECKIN

  /**
   *
   * @param {string} id
   * @param {string} name
   * @param {string} type
   * @param {string} time
   * @param {string} mkt_checkpoint_id_c
   */
  /*
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
   }*/

  /**
   * Return checkins in chronologically reversed order - this is for home display
   *
   * @returns {any[]}
   */
  /*
   public getAllCheckinsReversed(): any
   {
   return _.reverse(_.clone(this.CHECKINS));
   }*/

  /**
   *
   * @param {any} filter
   * @returns {any}
   */
  /*
   public getCheckins(filter = {}): any
   {
   return _.filter(this.CHECKINS, filter);
   }*/

  /**
   *
   * @param {any} filter
   * @returns {any}
   */
  /*
   public getCheckin(filter = {}): Checkin
   {
   return _.find(this.CHECKINS, filter) as Checkin;
   }*/

  /**
   *
   * @returns {any}
   */
  /*
   public getLastCheckin(): Checkin
   {
   return _.last(this.CHECKINS) as Checkin;
   }*/

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
    //let relativeCheckpoint = self.getCheckpoint({code: code});
    //console.log("RC: " + JSON.stringify(relativeCheckpoint));


    return new Promise(function (resolve, reject)
    {
      return reject(new Error("storeNewCheckin method in not implemented!"));
      /*
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
       self.initialize().then(() =>
       {
       resolve(newCheckinId);
       });
       } else
       {
       resolve(newCheckinId);
       }

       }).catch((e) =>
       {
       console.log("CHECKIN REGISTRATION ERROR: " + JSON.stringify(e));
       reject(e);
       });
       */
    });
  }

  /**
   * Loads checkins since last IN operation
   *
   *
   * @returns {Promise<any>}
   */
  /*
   private loadCheckins(): Promise<any>
   {
   let self = this;
   //let current_user_id = self.userService.getUserData('id');

   return new Promise(function (resolve, reject)
   {
   self.getEntryList('mkt_Checkin', {
   select_fields: ["id", "mkt_checkpoint_id_c", "checkin_date", "name"],
   /*query: 'user_id_c = ' + current_user_id + ' AND checkin_date >= "' + self.last_operation_date + '"',* /
   query: 'checkin_date >= "' + self.last_operation_date + '"',
   order_by: 'checkin_date ASC',
   max_results: 100
   })
   .then((res) =>
   {
   let checkpoint: any;
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
   }*/

  /**
   *
   * @returns {Promise<any>}
   */
  /*
   private findLastInOutOperation(): Promise<any>
   {
   let self = this;
   let lastOperationType = Checkpoint.TYPE_OUT;
   let lastOperationDate = moment().format(RemoteDataService.CRM_DATE_FORMAT);
   //let current_user_id = self.userService.getUserData('id');

   return new Promise(function (resolve, reject)
   {
   self.getEntryList('mkt_Checkin', {
   select_fields: ["id", "mkt_checkpoint_id_c", "checkin_date"],
   /*query: "assigned_user_id = " + current_user_id,* /
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
   */

  /**
   * @todo: should keep track of company od as well
   *
   * @returns {Promise<any>}
   */
  private findLastInOutOperation(): Promise<any>
  {
    let self = this;

    let lastOperationType = Checkpoint.TYPE_OUT;
    let lastOperationDate = moment().format(CrmDataModel.CRM_DATE_FORMAT);


    return new Promise(function (resolve, reject)
    {
      //IN/OUT
      self.checkpointProvider.getInOutCheckpoints().then((inOutCheckpoints) =>
      {
        let idList = _.map(inOutCheckpoints, "id");
        self.checkinProvider.findDocuments({
          selector: {
            checkin_date: {$ne: ''},
            mkt_checkpoint_id_c: {$in: idList}
          },
          fields: ['checkin_date', 'mkt_checkpoint_id_c'],
        }).then((res) =>
        {
          if (_.size(res.docs))
          {
            let mostRecentCheckin = _.last(_.sortBy(res.docs, ['checkin_date']));
            //console.log("MOST RECENT CHECKIN: ", mostRecentCheckin);
            let relatedCheckpoint = _.find(inOutCheckpoints, {id: mostRecentCheckin["mkt_checkpoint_id_c"]});
            if (!_.isUndefined(relatedCheckpoint))
            {
              //console.log("RELATED CHK: ", relatedCheckpoint);
              lastOperationType = relatedCheckpoint["type"];
              lastOperationDate = mostRecentCheckin["checkin_date"];
            }
          }
          resolve();
        }).catch((e) =>
        {
          console.error(e);
          resolve();
        });
      });
    }).finally(() => {
      self.last_operation_type = lastOperationType;
      self.last_operation_date = lastOperationDate;
      console.log("IDENTIFIED LAST IN/OUT OPERATION: " + lastOperationType + " @ " + lastOperationDate);
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

      self.checkpointProvider.initialize().then(() =>
      {
        return self.checkinProvider.initialize();
      }).then(() =>
      {
        return self.findLastInOutOperation();
      }).then(() =>
      {
        resolve();
      }).catch((e) =>
      {
        reject(e);
      });
    });
  }
}
