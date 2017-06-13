/**
 * Created by jack on 13/06/17.
 */

export class Checkpoint
{
  public static readonly TYPE_IN: string = "IN";
  public static readonly TYPE_OUT: string = "OUT";
  public static readonly TYPE_CHK: string = "CHK";
  public static readonly TYPE_PAUSE: string = "PAUSE";

  public id: string;
  public type: string;
  public code: string;
  public name: string;
  public description: string;
  public account_id_c: string;
  public account_reference: string;

  /**
   *
   * @param {string} id
   * @param {string} type
   * @param {string} code
   * @param {string} name
   * @param {string} description
   * @param {string} account_id_c
   * @param {string} account_reference
   */
  constructor(
    id:string,
    type: string,
    code: string,
    name:string,
    description:string,
    account_id_c: string,
    account_reference: string
  )
  {
    this.id = id;
    this.type = type;
    this.code = code;
    this.name = name;
    this.description = description;
    this.account_id_c = account_id_c;
    this.account_reference = account_reference;

    //console.log(this);
  }


}
