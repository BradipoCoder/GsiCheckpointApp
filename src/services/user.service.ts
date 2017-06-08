/**
 * Created by jack on 05/06/17.
 */
import {Injectable} from '@angular/core';
import {ConfigurationService} from './configuration.service';
import {RestService} from './rest.service';
import _ from "lodash";

@Injectable()
export class UserService
{
  private authenticated: boolean = false;
  private user_data: any = {};

  constructor(private configurationService: ConfigurationService
    , private restService: RestService)
  {
    this.initialize();
  }

  /**
   *
   * @returns {boolean}
   */
  isAuthenticated(): boolean
  {
    return this.authenticated;
  }

  /**
   *
   * @param {string} key
   * @returns {any}
   */
  getUserData(key:string):any
  {
    let answer;
    if(_.has(this.user_data, key))
    {
      answer = _.get(this.user_data, key);
    } else if (key == '*')
    {
      answer = this.user_data;
    } else {
      answer = '';
    }

    return answer;
  }

  /**
   *
   * @returns {Promise<any>}
   */
  logout(): Promise<any>
  {
    let self = this;
    console.log("Logging out...");
    return new Promise(function (resolve)
    {
      self.restService.logout().then(() =>
      {
        self.authenticated = false;
        self.user_data = {};
        resolve();
      }).catch((e) =>
      {
        console.log("LOGOUT ERROR! " + e);
        self.authenticated = false;
        self.user_data = {};
        resolve();
      });
    });
  }

  /**
   *
   * @param {string} username
   * @param {string} password
   */
  login(username:string, password:string): void
  {
    console.log("Authenticating user: " + username);
    this.restService.login(username, password).then((res) =>
    {
      this.user_data = this.restService.getAuthenticatedUser();
      this.user_data.id =  this.user_data.user_id;
      return this.restService.getEntry('Users', this.user_data.id);
    }).then((user_full_data) =>
    {
      user_full_data = _.head(user_full_data.entry_list);
      _.assignIn(this.user_data, user_full_data);
      //console.log("User#2" + JSON.stringify(this.user_data));

      //at last
      this.authenticated = true;
    }).catch((e) =>
    {
      console.log("LOGIN ERROR! " + e);
      //maybe we should rethrow and login page should trigger a toast message about this
    });

    //@todo: should trigger screen lock(loader) until login has completed
  }

  /**
   * initialize the Rest service
   */
  private initialize(): void
  {
    let rest_api_url: string, rest_api_version: string;

    this.configurationService.getConfig("crm_url")
      .then((value) =>
      {
        rest_api_url = value;
        return this.configurationService.getConfig("api_version")
      })
      .then((value) =>
      {
        rest_api_version = value;

        this.restService.initialize(rest_api_url, rest_api_version);
      });
  }
}


/*
 this.user_data:

 {
 "user_id":"1","user_name":"admin","user_language":"it_IT","user_currency_id":"-99","user_is_admin":true,
 "user_default_team_id":null,"user_default_dateformat":"d/m/Y","user_default_timeformat":"H:i",
 "user_number_seperator":".","user_decimal_seperator":",","mobile_max_list_entries":null,
 "mobile_max_subpanel_entries":null,"user_currency_name":"Euro","id":"1","module_name":"Users",
 "modified_by_name":"Administrator","created_by_name":"","user_hash":"","system_generated_password":"0",
 "pwd_last_changed":"","authenticate_id":"","sugar_login":"1",
 "first_name":"",
 "last_name":"Administrator",
 "full_name":"Administrator",
 "name":"Administrator",
 "is_admin":"1","external_auth_only":"0","receive_notifications":"1",
 "description":"","date_entered":"2017-05-12 13:42:51","date_modified":"2017-05-17 07:54:35","modified_user_id":"1",
 "created_by":"","title":"Administrator","photo":"","department":"","phone_home":"","phone_mobile":"",
 "phone_work":"","phone_other":"","phone_fax":"","status":"Active","address_street":"","address_city":"",
 "address_state":"","address_country":"","address_postalcode":"","UserType":"","deleted":"0","portal_only":"0",
 "show_on_employees":"1","employee_status":"Active","messenger_id":"","messenger_type":"","reports_to_id":"",
 "reports_to_name":"","email1":"hello@mekit.it","email_link_type":"","is_group":"0","c_accept_status_fields":"",
 "m_accept_status_fields":"","accept_status_id":"","accept_status_name":"","securitygroup_noninher_fields":"",
 "securitygroup_noninherit_id":"","securitygroup_noninheritable":"","securitygroup_primary_group":""
 }
*/
