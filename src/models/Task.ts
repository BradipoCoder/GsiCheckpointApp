/**
 * Checkin Model
 */
import {CrmDataModel} from './crm.data.model';
import _ from "lodash";
import * as moment from 'moment';
import {Checkpoint} from "./Checkpoint";

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

  public parent_type: string = null;
  public parent_id: string = null;

  //additional properties (non-db)
  public check_point: Checkpoint = null;
  public icon: string = null;
  public icon_color: string = null;

  /**
   * Create an instance by mapping supplied data to existent properties
   *
   * @param {{id:string}} data
   */
  constructor(data: any = {})
  {
    super(data);
    this.setData(data);
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

    this.setPriority(this.priority);
    this.setStatus(this.status);

    if(_.isEmpty(this.date_start))
    {
      this.date_start = moment().format(CrmDataModel.CRM_DATE_FORMAT);
    }

    if(_.isEmpty(this.date_due))
    {
      this.date_due = this.date_start;
    }

    this.checkPropertyDate('date_start');
    this.checkPropertyDate('date_due');
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

    //icon & color
    switch(this.priority)
    {
      case Task.PRIORITY_HIGH:
        this.icon = 'alert';
        this.icon_color = "danger";
        break;
      case Task.PRIORITY_MEDIUM:
        this.icon = 'alert';
        this.icon_color = "not-so-danger";
        break;
      case Task.PRIORITY_LOW:
        this.icon = 'alert';
        this.icon_color = "yellow-light";
        break;
      default:
        this.icon = 'alert';
        this.icon_color = "dark";
        break;
    }
  }

  /**
   *
   * @param {string} [format]
   * @returns {String}
   */
  getFormattedDateStart(format = null): String
  {
    let m = moment(this.date_start);
    m.locale("it");
    return m.format(format ? format : CrmDataModel.IT_DATE_FORMAT_FULL);
  }

  /**
   *
   * @param {string} [format]
   * @returns {String}
   */
  getFormattedDateDue(format = null): String
  {
    let m = moment(this.date_due);
    m.locale("it");
    return m.format(format ? format : CrmDataModel.IT_DATE_FORMAT_FULL);
  }

  /**
   * Data to be used to push to CRM (REST API)
   * @returns {{}}
   */
  public getRestData(): any
  {
    let self = this;
    let answer:any = {};
    let keys = this.getDefinedProperties(['']);
    _.each(keys, function (key)
    {
      if(!_.isNull(_.get(self, key, null))) {
        _.set(answer, key, _.get(self, key, null));
      }
    });

    //@todo: DATE TIME - UTC OFFSET FIX
    if(!_.isUndefined(answer.date_start))
    {
      answer.date_start = moment(answer.date_start).subtract(CrmDataModel.UTC_OFFSET_HOURS, "hours").format(CrmDataModel.CRM_DATE_FORMAT);
    }

    //@todo: DATE TIME - UTC OFFSET FIX
    if(!_.isUndefined(answer.date_due))
    {
      answer.date_due = moment(answer.date_due).subtract(CrmDataModel.UTC_OFFSET_HOURS, "hours").format(CrmDataModel.CRM_DATE_FORMAT);
    }

    return answer;
  }

  /**
   * @param {[]} additionalExcludeFields
   * @returns {string[]}
   */
  public getDefinedProperties(additionalExcludeFields:any = []): any
  {
    let nonModuleFields = ['icon', 'icon_color', 'check_point'];
    let properties = super.getDefinedProperties();
    return _.difference(_.difference(properties, nonModuleFields), additionalExcludeFields);
  }
}
