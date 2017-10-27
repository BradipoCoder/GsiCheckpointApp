/**
 * Checkin Model
 */
import {CrmDataModel} from './crm.data.model';
import {Checkpoint} from './Checkpoint'
import _ from "lodash";
import * as moment from 'moment';

export class Checkin extends CrmDataModel
{
  /** DATABASE TABLE NAME */
  public static readonly DB_TABLE_NAME: string = 'mkt_Checkin';

  /* the below properties must be initialized */
  public user_id_c: string = null;
  public checkin_user: string = null;
  public checkin_date: string = null;
  public mkt_checkpoint_id_c: string = null;
  public check_point: string = null;
  public duration: string = null;//seconds

  public type: string = null;
  public code: string = null;

  //additional properties

  public icon: string = null;
  public css_class: string = "row";

  /**
   * Create an instance by mapping supplied data to existent properties
   *
   * @param {{id:string}} data
   */
  constructor(data: any = {})
  {
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
    this.checkPropertyDate('checkin_date');
    this.checkPropertyDate('date_entered');
    this.checkPropertyDate('date_modified');


    //type & icon
    this.setType(this.type);

  }

  /**
   *
   * @param {String} type
   */
  public setType(type:string):void
  {
    this.type = _.includes(
      [Checkpoint.TYPE_IN, Checkpoint.TYPE_OUT, Checkpoint.TYPE_CHK, Checkpoint.TYPE_PAUSE]
      , type) ? type : Checkpoint.TYPE_CHK;

    let iconsByType = {};
    iconsByType[Checkpoint.TYPE_IN] = 'log-in';
    iconsByType[Checkpoint.TYPE_OUT] = 'log-out';
    iconsByType[Checkpoint.TYPE_CHK] = 'pin';
    iconsByType[Checkpoint.TYPE_PAUSE] = 'pause';

    this.icon = _.has(iconsByType, this.type) ? _.get(iconsByType, this.type).toString() : 'pin';

  }


  /**
   *
   */
  public setDurationFromNow():void
  {
    let checkinDuration = moment().diff(this.checkin_date, "seconds");
    this.duration = checkinDuration.toString();
  }

  /**
   * duration is stored in seconds
   * @returns {string}
   */
  getFormattedDuration(): string
  {
    let answer = '';
    let checkinDuration = parseInt(this.getPropertyValue("duration"));

    let hours = Math.floor(checkinDuration / 60 / 60);
    let minutes = Math.floor(checkinDuration / 60) - (60 * hours);
    let seconds = checkinDuration - (60 * 60 * hours) - (60 * minutes);

    if (hours)
    {
      answer += hours + " " + (hours > 1 ? "ore" : "ora");
    }
    if (minutes)
    {
      answer += (!_.isEmpty(answer)?" ":"") + minutes + " min";
    }
    if (seconds)
    {
      answer += (!_.isEmpty(answer)?" ":"") + seconds + "s";
    }

    return answer;
  }

  /**
   *
   * @returns {{}}
   */
  public getRestData(): any
  {
    let self = this;
    let answer:any = {};
    let keys = this.getDefinedProperties(['checkin_user']);
    _.each(keys, function (key)
    {
      if(!_.isNull(_.get(self, key, null))) {
        _.set(answer, key, _.get(self, key, null));
      }
    });

    //@todo: DATE TIME - UTC OFFSET FIX
    if(!_.isUndefined(answer.checkin_date))
    {
      answer.checkin_date = moment(answer.checkin_date).subtract(CrmDataModel.UTC_OFFSET_HOURS, "hours").format(CrmDataModel.CRM_DATE_FORMAT);
    }

    return answer;
  }

  /**
   * @param {[]} additionalExcludeFields
   * @returns {string[]}
   */
  public getDefinedProperties(additionalExcludeFields:any = []): any
  {
    let nonModuleFields = ['css_class', 'icon'];
    let properties = super.getDefinedProperties();
    return _.difference(_.difference(properties, nonModuleFields), additionalExcludeFields);
  }
}
