/**
 * Checkpoint Model
 */
import {CrmDataModel} from './crm.data.model';
import _ from "lodash";
import * as moment from 'moment';
import {LogService} from "../services/log.service";

export class Checkpoint extends CrmDataModel
{
  /** DATABASE TABLE NAME */
  public static readonly DB_TABLE_NAME: string = 'mkt_Checkpoint';

  /** TYPES */
  public static readonly TYPE_IN: string = "IN";
  public static readonly TYPE_OUT: string = "OUT";
  public static readonly TYPE_CHK: string = "CHK";
  public static readonly TYPE_PAUSE: string = "PAUSE";

  /* the below properties must be initialized */
  public type: string = null;
  public code: string = null;
  public position: string = null;
  public account_id_c: string = null;
  public account_reference: string = null;
  public checked_c: string = null;
  public checklist_c: string = null;

  /**
   * Create an instance by mapping supplied data to existent properties
   *
   * @param {any} data
   */
  constructor(data: any = {}) {
    super(data);

    //console.log("Undefined keys", _.difference(_.keys(data), _.keys(this)));
    let self = this;
    _.each(_.keys(this), function (key)
    {
      if (_.has(data, key))
      {
        _.set(self, key, _.get(data, key, null));
      }
    });

    //date checks
    this.checkPropertyDate('date_entered');
    this.checkPropertyDate('date_modified');
  }


  /**
   * @todo: devel method - remove!
   */
  public dump(): void {
    LogService.log("Checkpoint", JSON.stringify(this));
  }
}
