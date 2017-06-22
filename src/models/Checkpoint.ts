/**
 * Checkpoint Model
 */
import _ from "lodash";

export class Checkpoint {
  public static readonly TYPE_IN: string = "IN";
  public static readonly TYPE_OUT: string = "OUT";
  public static readonly TYPE_CHK: string = "CHK";
  public static readonly TYPE_PAUSE: string = "PAUSE";

  /* the below properties must be initialized */
  public id: string                  = null;
  public type: string                = null;
  public code: string                = null;
  public name: string                = null;
  public description: string         = null;
  public position: string            = null;
  public account_id_c: string        = null;
  public account_reference: string   = null;
  public date_entered: string        = null;
  public date_modified: string       = null;

  /**
   * Create an instance by mapping supplied data to existent properties
   *
   * @param {{id:string}} data
   */
  constructor(data: any = {}) {
    console.log("Undefined keys", _.difference(_.keys(data), _.keys(this)));
    let self = this;
    _.each(_.keys(this), function(key) {
      _.set(self, key, _.get(data, key, null));
    });
  }


  /**
   *
   * @returns {string[]}
   */
  public getDefinedProperties():any
  {
    return _.keys(this);
  }

  /**
   * @todo: devel method - remove!
   */
  public dump(): void {
    console.log("Checkpoint", this);
  }
}
