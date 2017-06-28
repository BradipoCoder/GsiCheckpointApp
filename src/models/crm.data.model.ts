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
    this.id = _.uniqueId("ID_");
    this._id = this.id;
    this.date_entered = moment().format(CrmDataModel.CRM_DATE_FORMAT);
    this.date_modified = moment().format(CrmDataModel.CRM_DATE_FORMAT);
    this.deleted = "0";
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
   * @param {string} property
   * @param {string} [format]
   * @throws {Error}
   */
  protected checkPropertyDate(property:string, format:string = null):void
  {
    let dateValue = this.getPropertyValue(property);
    let date = moment(dateValue, CrmDataModel.CRM_DATE_FORMAT);
    if(!_.isEmpty(dateValue) && !date.isValid())
    {
      throw new Error("Checkin: Invalid date on property["+property+"]: " + dateValue);
    }
  }

  /**
   *
   * @param {string} property
   * @param {string} [format]
   */
  protected getDatePropertyValue(property:string, format:string = null):string
  {
    format = format || CrmDataModel.CRM_DATE_FORMAT;
    let dateValue = this.getPropertyValue(property);
    let date = moment(dateValue, CrmDataModel.CRM_DATE_FORMAT);
    return date.format(format);
  }

  /**
   *
   * @param {string} property
   * @throws {Error}
   * @returns {any}
   */
  protected getPropertyValue(property:string):any
  {
    if(!_.has(this, property))
    {
      throw new Error("No property by this name["+property+"]!");
    }
    return _.get(this, property);
  }

  /**
   *
   * @returns {string[]}
   */
  public getDefinedProperties(): any {
    return _.keys(this);
  }
}
