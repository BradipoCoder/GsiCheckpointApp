/**
 * Data Model for SugarCRM modules
 */
import _ from "lodash";
import * as moment from 'moment';

export class CrmDataModel
{
  public static readonly TEMPORARY_ID_PREFIX: string = "ID___";

  public static readonly CRM_DATE_FORMAT: string = "YYYY-MM-DD HH:mm:ss";

  public static readonly IT_DATE_FORMAT_FULL: string = "DD/MM/YYYY HH:mm:ss";
  public static readonly IT_DATE_FORMAT_DATE_ONLY: string = "DD/MM/YYYY";
  public static readonly IT_DATE_FORMAT_TIME_ONLY: string = "HH:mm:ss";

  public static readonly SYNC_STATE__IN_SYNC: string = "in-sync";
  public static readonly SYNC_STATE__NEW: string = "new";
  public static readonly SYNC_STATE__CHANGED: string = "changed";
  public static readonly SYNC_STATE__DELETED: string = "deleted";

  public static readonly UTC_OFFSET_HOURS: number = 2;


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

  //
  public module_name: string = null;
  public sync_state: string = CrmDataModel.SYNC_STATE__IN_SYNC;
  public sync_last_check: string = null;

  /* NON-MODULE FIELDS */
  public checklist_items: any = null;

  /**
   *
   * @param {any} data
   */
  constructor(data: any)
  {
    this.id = _.uniqueId(CrmDataModel.TEMPORARY_ID_PREFIX);
    this._id = this.id;

    this.date_entered = moment().format(CrmDataModel.CRM_DATE_FORMAT);
    this.date_modified = moment().format(CrmDataModel.CRM_DATE_FORMAT);
    this.deleted = "0";

    this.sync_last_check = moment().format(CrmDataModel.CRM_DATE_FORMAT);
  }

  /**
   * split original crm formatted ^xxx^,^yyy^,... to key/val object
   *
   * @param {string} checklist
   */
  protected setChecklistItemsFromString(checklist:string): void
  {
    if(!_.isEmpty(checklist))
    {
      let elements = checklist.split(",");
      if(_.size(elements))
      {
        this.checklist_items = {};
        let key, val, key_elements, key_name_stub, key_multiplier, new_name;
        _.each(elements, (element) => {
          key = element.replace(new RegExp("\\^", 'g'), "");

          key_elements = _.split(key, "__");
          key_name_stub = key_elements[0];
          key_multiplier = !_.isUndefined(key_elements[1]) ? key_elements[1] : null;
          new_name = _.upperFirst(_.lowerCase(key_name_stub));


          val = new_name
            + (!_.isEmpty(key_multiplier) ? " (x" + key_multiplier + ")" : "")
          ;

          _.set(this.checklist_items, key, val);
        });

        //LogService.log("CLI-STR: " + JSON.stringify(this.checklist_items));

      }
    }
  }

  /**
   * @param {any} elements
   */
  public setChecklistItemsFromArray(elements:any): void
  {
    this.checklist_items = {};
    if(_.size(elements))
    {

      let val, key_elements, key_name_stub, key_multiplier, new_name;
      _.each(elements, (key) => {

        key_elements = _.split(key, "__");
        key_name_stub = key_elements[0];
        key_multiplier = !_.isUndefined(key_elements[1]) ? key_elements[1] : null;
        new_name = _.startCase(key_name_stub);

        val = new_name
          + (!_.isEmpty(key_multiplier) ? "(x" + key_multiplier + ")" : "")
        ;

        _.set(this.checklist_items, key, val);
      });

      //LogService.log("CLI-ARR: " + JSON.stringify(this.checklist_items));
    }
  }

  /**
   * Returns a SugarCRM absurdly formatted string from an array of elements: ^AAA^, ^BBB^, ^CCC^
   *
   * @param {any} elements
   * @returns {string}
   */
  public getChecklistStringFromArray(elements:any): string
  {
    let answer = '';
    if(_.size(elements))
    {
      let list = [];
      _.each(elements, (key) => {
        list.push('^' + key + '^');
      });
      answer = _.join(list, ",");
    }

    return answer;
  }

  /**
   *
   * @returns {boolean}
   */
  public hasChecklistValues(): boolean
  {
    return _.size(this.checklist_items) > 0;
  }

  /**
   * @param {string} key
   * @returns {boolean}
   */
  public hasChecklistValue(key:string): boolean
  {
    return _.includes(_.keys(this.checklist_items), key);
  }

  /**
   *
   * @returns {number}
   */
  public getChecklistValueCount():any
  {
    return _.size(this.checklist_items);
  }

  /**
   *
   * @returns {any}
   */
  public getChecklistValues():any
  {
    return _.values(this.checklist_items);
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
   * @throws {Error}
   */
  protected checkPropertyDate(property:string):void
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
    let exclude = ['_id', 'sync_state', 'sync_last_check', 'module_name', 'deleted', 'date_entered', 'date_modified'
      , 'assigned_user_name', 'created_by', 'created_by_name'
    ];
    let keys = _.keys(this);
    keys = _.difference(keys, exclude);
    return keys;
  }
}
