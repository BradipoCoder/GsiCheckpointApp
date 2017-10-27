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

  /* NON-MODULE FIELDS */
  public checklist_items: any = null;

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

    this.createChecklistArray();
  }

  public getChecklistValues():any
  {
    return _.values(this.checklist_items);
  }

  /**
   * split original crm formatted ^xxx^,^yyy^,... to key/val object
   */
  private createChecklistArray(): void
  {
    if(!_.isEmpty(this.checklist_c))
    {
      let elements = this.checklist_c.split(",");
      if(_.size(elements))
      {
        this.checklist_items = {};
        let key, val, key_elements, key_name_stub, key_multiplier, new_name;
        _.each(elements, (element) => {
          key = element.replace(new RegExp("\\^", 'g'), "");

          key_elements = _.split(key, "__");
          key_name_stub = key_elements[0];
          key_multiplier = !_.isUndefined(key_elements[1]) ? key_elements[1] : null;
          new_name = _.startCase(key_name_stub);

          val = new_name
            + (!_.isEmpty(key_multiplier) ? "(x" + key_multiplier + ")" : "")
            ;

          _.set(this.checklist_items, key, val);
        });

        LogService.log("CLI: " + JSON.stringify(this.checklist_items));

      }
    }
  }

  /**
   * @param {[]} additionalExcludeFields
   * @returns {string[]}
   */
  public getDefinedProperties(additionalExcludeFields:any = []): any
  {
    let nonModuleFields = ['checklist_items'];
    let properties = super.getDefinedProperties();
    return _.difference(_.difference(properties, nonModuleFields), additionalExcludeFields);
  }
}
