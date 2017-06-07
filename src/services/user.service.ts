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
  private user_id: string = "";

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

  getUserId(): string
  {
    return this.user_id;
  }

  /**
   *
   * @param {string} username
   * @param {string} password
   */
  login(username:string, password:string): void
  {
    console.log("Authenticating user: " + username);
    this.restService.login(username, password).then(() =>
    {

      return this.restService.getUserId();
    }).then((user_id) =>
    {
      this.user_id = user_id;

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
