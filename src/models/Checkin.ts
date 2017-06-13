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

  constructor(
    id:string,
    name:string,
    type: string,
    time: string,
    duration: string,
    mkt_checkpoint_id_c:string
  )
  {
    this.id = id;
    this.name = name;
    this.duration = duration;
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

    //console.log(this);
  }

  getFormattedTime(format:string = "H:mm"):string
  {
    return moment(this.time).format(format);
  }


}
