/**
 * Created by jack on 13/06/17.
 */
import {Checkpoint} from './Checkpoint'
import _ from "lodash";
import * as moment from 'moment';

export class Checkin
{
  public id:string;
  public name:string;
  public type:string;
  public icon:string;
  public time:Date;
  public duration:string;
  public mkt_checkpoint_id_c:string;
  //
  public css_class:string = "row";

  constructor(
    id:string,
    name:string,
    type: string,
    time: string,
    mkt_checkpoint_id_c:string
  )
  {
    this.id = id;
    this.name = name;
    this.mkt_checkpoint_id_c = mkt_checkpoint_id_c;

    //time
    let m = moment(time);
    if(!m.isValid())
    {
      throw new Error("Invalid date supplied: " + time);
    }
    this.time = m.toDate();

    //type (check?)
    this.type = type;

    //icon
    let iconsByType = {};
    iconsByType[Checkpoint.TYPE_IN] = 'log-in';
    iconsByType[Checkpoint.TYPE_OUT] = 'log-out';
    iconsByType[Checkpoint.TYPE_CHK] = 'pin';
    iconsByType[Checkpoint.TYPE_PAUSE] = 'pause';
    this.icon = _.has(iconsByType, type) ? _.get(iconsByType, type).toString() : 'help';

    //duration
    this.setDurationFromNow();

    //console.log(this);
  }

  getFormattedTime(format:string = "H:mm"):string
  {
    return moment(this.time).format(format);
  }

  setDurationFromNow():void
  {
    let checkinDuration = moment().diff(this.time, "seconds");

    let hours = Math.floor(checkinDuration / 60 / 60);
    let minutes = Math.floor(checkinDuration / 60) - (60 * hours);
    let seconds = checkinDuration - (60 * 60 * hours) - (60 * minutes);

    let durationStr = '';
    if (hours)
    {
      durationStr += hours + " " + (hours > 1 ? "ore" : "ora") + " ";
    }
    durationStr += minutes + " min";
    //durationStr += " " + seconds + "s";

    this.duration = durationStr;
  }


}
