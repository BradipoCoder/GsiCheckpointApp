/**
 * Created by jack on 05/06/17.
 */
import {Injectable} from '@angular/core';
import {RestService} from './rest.service';
import _ from "lodash";

@Injectable()
export class UserService
{
  private authenticated:boolean = false;

  constructor(private restService:RestService)
  {
  }

  isAuthenticated():boolean {
    return this.authenticated;
  }

  authenticate(username, password):boolean {
    this.authenticated = true;
    return this.isAuthenticated();
  }
}
