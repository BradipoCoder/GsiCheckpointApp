/**
 * Created by jack on 05/06/17.
 */
import {Injectable} from '@angular/core';
import {ConfigurationService} from './configuration.service';
import {OfflineCapableRestService} from './offline.capable.rest.service';
import PouchDB from "pouchdb";
import _ from "lodash";

@Injectable()
export class UserService
{
  private authenticated: boolean = false;
  private user_data: any = {};
  public is_initialized = false;
  public is_user_configured = false;
  public last_error: Error;
  private db: any;


  constructor(private configurationService: ConfigurationService
    , private offlineCapableRestService: OfflineCapableRestService)
  {
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
  getUserData(key: string): any
  {
    let answer;
    if (_.has(this.user_data, key))
    {
      answer = _.get(this.user_data, key);
    } else if (key == '*')
    {
      answer = this.user_data;
    } else
    {
      answer = '';
    }

    return answer;
  }

  /**
   * Log out user and delete "user" database
   * @returns {Promise<any>}
   */
  logout(): Promise<any>
  {
    let self = this;
    console.log("Logging out...");
    return new Promise(function (resolve)
    {
      self.offlineCapableRestService.logout().then(() =>
      {
        self.authenticated = false;
        return self.db.destroy();
      }).then(() => {
        console.log("User database has been destroyed.");
        self.user_data = {};
        resolve();
      }).catch((e) =>
      {
        self.last_error = e;
        console.log("LOGOUT ERROR! " + e);
        self.authenticated = false;
        self.is_initialized = false;
        self.is_user_configured = false;
        self.user_data = {};
        self.db.destroy().then(() => {
          console.log("User database has been destroyed.");
          resolve();
        }).catch((e) => {
          resolve();
        });
      });
    });
  }

  /**
   *
   * @param {string} username
   * @param {string} password
   *
   * @returns {Promise<any>}
   */
  private login(username: string, password: string): Promise<any>
  {
    let self = this;
    console.log("Authenticating user: " + username);
    return new Promise(function (resolve, reject)
    {
      self.offlineCapableRestService.login(username, password).then((res) =>
      {
        self.user_data = self.offlineCapableRestService.getAuthenticatedUser();
        self.user_data.id = self.user_data.user_id;
        return self.offlineCapableRestService.getEntry('Users', self.user_data.id);
      }).then((user_full_data) =>
      {
        user_full_data = _.head(user_full_data.entry_list);
        _.assignIn(self.user_data, user_full_data);
        return self.storeUserData(self.user_data);
      }).then(() =>
      {
        self.authenticated = true;
        resolve();
      }).catch((e) =>
      {
        self.last_error = e;
        console.log("LOGIN ERROR! " + e);
        reject(e);
      });
    });
  }

  /**
   * Store logged in user values for offline usage
   *
   * @param {any} data
   * @returns {Promise<any>}
   */
  storeUserData(data): Promise<any>
  {
    let self = this;

    return new Promise(function (resolve, reject)
    {
      self.db.get('userdata').then(function(doc) {
        _.assignIn(data, {_id: 'userdata', _rev: doc._rev});
        return self.db.put(data);
      }).then(function(res) {
        console.log("User data stored");
        resolve();
      }).catch(function (err) {
        //console.log(err);
        _.assignIn(data, {_id: 'userdata'});
        self.db.put(data).then((res) => {
          console.log("User data stored(new)");
          resolve();
        });
      });
    });
  };

  /**
   * initialize the Rest service
   */
  initialize(): Promise<any>
  {
    let self = this;
    self.authenticated = false;
    self.is_initialized = false;
    self.is_user_configured = false;
    self.user_data = {};

    return new Promise(function (resolve, reject)
    {
      self.db = new PouchDB('user', {auto_compaction: true, revs_limit: 10});

      self.configurationService.getConfigObject()
        .then((cfg) =>
        {
          self.is_initialized = true;
          self.offlineCapableRestService.initialize(cfg.crm_url, cfg.api_version);

          if (!(_.isEmpty(cfg.crm_username) && _.isEmpty(cfg.crm_password)))
          {
            self.is_user_configured = true;
            console.log("AUTOLOGIN(" + cfg.crm_username + ")...");
            self.login(cfg.crm_username, cfg.crm_password).then(() =>
            {
              resolve();
            }).catch((e) =>
            {
              self.last_error = e;
              console.warn("Autologin failed! " + e);
              //load user data from db
              self.db.get('userdata').then(function(doc) {
                console.log(doc);
                self.user_data = doc;
                resolve();
              }).catch((e) => {
                self.last_error = new Error("User data is not available! " + e);
                console.warn(self.last_error.message);
                self.is_user_configured = false;
                resolve();
              });
            });
          } else
          {
            self.last_error = new Error("Configuration is incomplete!");
            console.warn("Configuration is incomplete!");
            resolve();
          }
        })
        .catch((e) =>
        {
          self.last_error = e;
          reject(e);
        });
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
