/**
 * Checkin Model
 */
import {CrmDataModel} from './crm.data.model';
import {Checkpoint} from './Checkpoint'
import _ from "lodash";
import * as moment from 'moment';

export class Checkin extends CrmDataModel {
  /* the below properties must be initialized */
  public user_id_c: string = null;
  public checkin_user: string = null;
  public checkin_date: string = null;
  public mkt_checkpoint_id_c: string = null;
  public check_point: string = null;
  public duration: string = null;

  //
  public time: string;
  public type: string;
  public icon: string;
  public css_class: string;

  /**
   * Create an instance by mapping supplied data to existent properties
   *
   * @param {{id:string}} data
   */
  constructor(data: any = {}) {
    super();

    //console.log("Undefined keys", _.difference(_.keys(data), _.keys(this)));
    let self = this;
    _.each(_.keys(this), function (key) {
      _.set(self, key, _.get(data, key, null));
    });

    this.type = data.type;
    this.css_class = "row";


    //time - @todo: reenable checks
    let m = moment(this.time);
    /*
    if (!m.isValid()) {
      throw new Error("Invalid date supplied: " + this.time);
    }
    */
    //this.time = m.toDate();

    //icon
    let iconsByType = {};
    iconsByType[Checkpoint.TYPE_IN] = 'log-in';
    iconsByType[Checkpoint.TYPE_OUT] = 'log-out';
    iconsByType[Checkpoint.TYPE_CHK] = 'pin';
    iconsByType[Checkpoint.TYPE_PAUSE] = 'pause';
    this.icon = _.has(iconsByType, this.type) ? _.get(iconsByType, this.type).toString() : 'help';

    //duration
    //this.setDurationFromNow();

    //console.log(this);
  }

  getFormattedTime(format: string = "H:mm"): string {
    return moment(this.time).format(format);
  }

  setDurationFromNow(): void {
    let checkinDuration = moment().diff(this.time, "seconds");

    let hours = Math.floor(checkinDuration / 60 / 60);
    let minutes = Math.floor(checkinDuration / 60) - (60 * hours);
    //let seconds = checkinDuration - (60 * 60 * hours) - (60 * minutes);

    /*
    let durationStr = '';
    if (hours) {
      durationStr += hours + " " + (hours > 1 ? "ore" : "ora") + " ";
    }
    durationStr += minutes + " min";
    //durationStr += " " + seconds + "s";
    */
    this.duration = minutes.toString();
  }

  /**
   *
   * @returns {string[]}
   */
  public getDefinedProperties(): any {
    let nonModuleFields = ['css_class', 'type', 'icon'];
    let properties = super.getDefinedProperties();
    return _.difference(properties, nonModuleFields);
  }
}
