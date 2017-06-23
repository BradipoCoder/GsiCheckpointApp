/**
 * Data Model for SugarCRM modules
 */
import _ from "lodash";
import * as moment from 'moment';

export class CrmDataModel
{
  public static readonly CRM_DATE_FORMAT: string = "YYYY-MM-DD HH:mm:ss";

  /* PouchDb doc related */
  public _id: string;
  public _rev: string;

  /* the below properties must be initialized */
  public id: string = null;
  public name: string = null;
  public description: string = null;
  public date_entered: string = null;
  public date_modified: string = null;

  public deleted: string = null;

  public assigned_user_id: string = null;
  public assigned_user_name: string = null;

  public created_by: string = null;
  public created_by_name: string = null;

  public modified_user_id: string = null;
  public modified_by_name: string = null;

  public module_name: string = null;

  constructor()
  {
    /**/
  }

  /**
   * @returns {Date}
   */
  public getDateEntered(): Date
  {
    return moment(this.date_entered).toDate();
  }

  /**
   * @returns {Date}
   */
  public getDateModified(): Date
  {
    return moment(this.date_modified).toDate();
  }

  /**
   *
   * @param date
   * @returns {boolean}
   */
  public isNewer(date:Date): boolean
  {
    return (moment(this.date_modified).diff(date, "seconds")) > 0;
  }

  /**
   *
   * @returns {string[]}
   */
  public getDefinedProperties(): any {
    return _.keys(this);
  }
}
