/**
 * Created by jack on 05/06/17.
 */
import {Injectable} from '@angular/core';
import {ConfigurationService} from './configuration.service';
import {OfflineCapableRestService} from './offline.capable.rest.service';
import {Promise} from '../../node_modules/bluebird'
import PouchDB from "pouchdb";
import _ from "lodash";
import {LogService} from "./log.service";

@Injectable()
export class UserService
{
  private authenticated: boolean = false;
  private user_data: any = {};
  public is_initialized = false;
  public is_user_configured = false;
  public last_error: Error;
  private db: any;

  private autologin_skips = 0;
  private max_autologin_skips = 150;


  constructor(private configurationService: ConfigurationService
    , private offlineCapableRestService: OfflineCapableRestService)
  {
  }

  /**
   * For some special users we can show special stuff/buttons
   * @returns {boolean}
   */
  public isTrustedUser(): boolean
  {
    let answer;

    let trustedUsers = ['jakabadambalazs'];
    let username = this.getUserData('user_name', false);

    answer = _.includes(trustedUsers, username);

    return answer;
  }

  /**
   *
   * @returns {boolean}
   */
  public isAuthenticated(): boolean
  {
    return this.authenticated;
  }

  /**
   *
   */
  private unsetOfflineUserData(): void
  {
    this.is_user_configured = false;
    this.user_data = {};
  }

  /**
   *
   * @returns {Promise<any>}
   */
  public configureWithOfflineUserData(): Promise<any>
  {

    LogService.log("configureWithOfflineUserData...", LogService.LEVEL_WARN);

    let self = this;
    this.unsetOfflineUserData();

    return new Promise(function (resolve, reject) {
      self.db.get('userdata').then((doc) => {
          self.user_data = doc;
          self.is_user_configured = true;
          resolve();
        }, (e) => {
          return reject(e);
        }
      );
    });
  }

  /**
   * Store logged in user values for offline usage
   *
   * @param {any} data
   * @returns {Promise<any>}
   */
  public storeOfflineUserData(data): Promise<any>
  {
    let self = this;

    return new Promise(function (resolve) {

      //todo: this only works if you are logged in on CRM
      //fixme: create a custom entry point on CRM for public image
      if (!_.isUndefined(data.id))
      {
        data.avatar_uri = 'http://gsi.crm.mekit.it/index.php?entryPoint=download'
          + '&id=' + data.id + '_photo'
          + '&type=Users'
      }

      self.db.get('userdata').then((doc) => {
        _.assignIn(data, {_id: 'userdata', _rev: doc._rev});
        return self.db.put(data);
      }).then(() => {
        //LogService.log("User data stored");
        resolve();
      }).catch(() => {
        //LogService.log(err);
        _.assignIn(data, {_id: 'userdata'});
        self.db.put(data).then(() => {
          //LogService.log("User data stored(new)");
          resolve();
        });
      });
    });
  };

  /**
   *
   * @param {string} key
   * @param {any} default_value
   * @returns {any}
   */
  public getUserData(key: string, default_value: any = ''): any
  {
    let answer = default_value;

    if (_.has(this.user_data, key))
    {
      answer = _.get(this.user_data, key);
    } else if (key == '*')
    {
      answer = this.user_data;
    }

    return answer;
  }

  /**
   * Log out user and delete "user" database
   * @returns {Promise<any>}
   */
  public logout(): Promise<any>
  {
    let self = this;
    self.unsetOfflineUserData();
    LogService.log("Logging out...");
    return new Promise(function (resolve) {
      self.offlineCapableRestService.logout().then(() => {
        self.authenticated = false;
        self.db.destroy().then(() => {
          LogService.log("User database has been destroyed.");
          self.createDatabase();
          resolve();
        });
      }).catch((e) => {
        self.last_error = e;
        LogService.log("LOGOUT ERROR! " + e);
        self.authenticated = false;
        self.is_initialized = false;
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
  public login(username: string, password: string): Promise<any>
  {
    let self = this;
    LogService.log("Authenticating user: " + username);

    return new Promise(function (resolve, reject) {
      self.offlineCapableRestService.login(username, password)
        .then(() => {
            //LogService.log("LOGIN DATA:", res);
            self.user_data = self.offlineCapableRestService.getAuthenticatedUser();
            self.user_data.id = self.user_data.user_id;
            self.offlineCapableRestService.getEntry('Users', self.user_data.id)
              .then((user_full_data) => {
                  user_full_data = _.head(user_full_data.entry_list);
                  _.assignIn(self.user_data, user_full_data);
                  self.storeOfflineUserData(self.user_data).then(() => {
                      self.authenticated = true;
                      self.storeOfflineUserData(self.user_data).then(() => {
                          resolve();
                        }, (e) => {
                          LogService.log("LOGIN ERROR! " + e);
                          self.authenticated = false;
                          return reject(e);
                        }
                      );
                    }, (e) => {
                      LogService.log("LOGIN ERROR! " + e);
                      self.authenticated = false;
                      return reject(e);
                    }
                  );
                }, (e) => {
                  LogService.log("LOGIN ERROR! " + e);
                  self.authenticated = false;
                  return reject(e);
                }
              );
          }, (e) => {
            LogService.log("LOGIN ERROR! " + e);
            self.authenticated = false;
            return reject(e);
          }
        );
    });
  }

  /**
   * Log user in automatically
   *  @returns {Promise<any>}
   */
  public autologin(): Promise<any>
  {
    let self = this;

    return new Promise(function (resolve, reject) {
      if (!self.isAuthenticated() || self.autologin_skips >= self.max_autologin_skips)
      {
        self.autologin_skips = 0;
        let config;
        self.configurationService.getConfigObject()
          .then((cfg) => {
            config = cfg;
            if (_.isEmpty(cfg.crm_username) || _.isEmpty(cfg.crm_password))
            {
              return reject(new Error("AUTOLOGIN - missing username or password"));
            }
            return self.login(cfg.crm_username, cfg.crm_password);
          }, () => {
            return reject(new Error("AUTOLOGIN - Configuration object is not available!"));
          })
          .then(() => {
            LogService.log("AUTOLOGIN SUCCESS");
            resolve();
          }, (e) => {
            LogService.log("AUTOLOGIN FAILED: " + e);
            return reject(e);
          });
      } else
      {
        self.autologin_skips++;
        //LogService.log("AUTOLOGIN SUCCESS(NOT NECESSARY)["+self.autologin_skips+"]");
        resolve();
      }
    });
  }


  public initialize(): Promise<any>
  {
    let self = this;
    this.is_initialized = false;

    return new Promise(function (resolve) {
      self.unsetOfflineUserData();
      self.createDatabase();
      self.configurationService.getConfigObject()
        .then((cfg) => {
          self.is_initialized = true;
          self.offlineCapableRestService.initialize(cfg.crm_url, cfg.api_version);

          if (_.isEmpty(cfg.crm_username) || _.isEmpty(cfg.crm_password))
          {
            self.last_error = new Error("Configuration is incomplete!");
            LogService.log("Configuration is incomplete!", LogService.LEVEL_WARN);
            resolve();
          }

          return self.configureWithOfflineUserData();
        }, (e) => {
          self.last_error = new Error("Configuration object is not available! " + e);
          LogService.log(self.last_error.message, LogService.LEVEL_WARN);
          resolve();
        }).then(() => {
          self.autologin().then(() => {
              resolve()
            }, (e) => {
              LogService.log("Unsuccessful autologin! " + e, LogService.LEVEL_WARN);
              resolve()
            }
          );
        }, () => {

          self.autologin().then(() => {
              resolve()
            }, (e) => {
              self.last_error = new Error("User data is not available! " + e);
              LogService.log(self.last_error.message, LogService.LEVEL_WARN);
              return resolve();
            }
          );

        }
      );

    });
  }

  /**
   *
   */
  private createDatabase(): void
  {
    this.db = new PouchDB('user', {auto_compaction: true, revs_limit: 10});
    LogService.log("new user database was created");
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
