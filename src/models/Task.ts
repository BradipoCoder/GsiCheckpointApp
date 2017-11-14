/**
 * Checkin Model
 */
import {CrmDataModel} from './crm.data.model';
import _ from "lodash";
import * as moment from 'moment';

export class Task extends CrmDataModel
{
  /** DATABASE TABLE NAME */
  public static readonly DB_TABLE_NAME: string = 'Tasks';

  /** PRIORITY */
  public static readonly PRIORITY_HIGH: string = "High";
  public static readonly PRIORITY_MEDIUM: string = "Medium";
  public static readonly PRIORITY_LOW: string = "Low";

  /** STATUS */
  public static readonly STATUS_NOT_STARTED: string = "Not Started";
  public static readonly STATUS_IN_PROGRESS: string = "In Progress";
  public static readonly STATUS_COMPLETED: string = "Completed";
  public static readonly STATUS_PENDING_INPUT: string = "Pending Input";
  public static readonly STATUS_DEFERRED: string = "Deferred";

  /* the below properties must be initialized */
  public date_start: string = null;
  public date_due: string = null;
  public priority: string = null;
  public status: string = null;

  //additional properties (non-db)
  public icon: string = null;

  /**
   * Create an instance by mapping supplied data to existent properties
   *
   * @param {{id:string}} data
   */
  constructor(data: any = {})
  {
    super(data);

    //console.log("Undefined keys", _.difference(_.keys(data), _.keys(this)));
    // let self = this;
    // _.each(_.keys(this), function (key)
    // {
    //   if (_.has(data, key))
    //   {
    //     _.set(self, key, _.get(data, key, null));
    //   }
    // });
    this.setData(data);

    //
    this.setPriority(this.priority);
    this.setStatus(this.status);

    //date checks
    this.checkPropertyDate('date_start');
    this.checkPropertyDate('date_due');

    //type & icon
    this.icon = 'pin';
  }

  /**
   *
   * @param data
   */
  public setData(data: any = {}):void
  {
    let self = this;
    _.each(_.keys(this), function (key)
    {
      if (_.has(data, key))
      {
        _.set(self, key, _.get(data, key, null));
      }
    });
  }

  /**
   *
   * @param {String} status
   */
  public setStatus(status:string):void
  {
    this.status = _.includes(
      [Task.STATUS_NOT_STARTED, Task.STATUS_IN_PROGRESS, Task.STATUS_COMPLETED, Task.STATUS_PENDING_INPUT, Task.STATUS_DEFERRED]
      , status) ? status : Task.STATUS_IN_PROGRESS;
  }

  /**
   *
   * @param {String} priority
   */
  public setPriority(priority:string):void
  {
    this.priority = _.includes(
      [Task.PRIORITY_HIGH, Task.PRIORITY_MEDIUM, Task.PRIORITY_LOW]
      , priority) ? priority : Task.PRIORITY_MEDIUM;
  }

  /**
   * @param {[]} additionalExcludeFields
   * @returns {string[]}
   */
  public getDefinedProperties(additionalExcludeFields:any = []): any
  {
    let nonModuleFields = ['icon'];
    let properties = super.getDefinedProperties();
    return _.difference(_.difference(properties, nonModuleFields), additionalExcludeFields);
  }
}
