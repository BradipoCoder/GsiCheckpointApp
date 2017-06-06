import {Component} from '@angular/core';
import {NavController} from 'ionic-angular';
import {UserService} from '../../services/user.service';

import {LoginPage} from "../login/login";

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage
{
  loginPage: any;
  loginPageParams: Object;

  constructor(public navCtrl: NavController
    , private userService: UserService)
  {
    this.loginPage = LoginPage;
    this.loginPageParams = {xxx: 123, yyy: 456};

    /*
    console.log("Auth1: " + this.userService.isAuthenticated());
    this.userService.authenticate("aaa", "bbb");
    console.log("Auth2: " + this.userService.isAuthenticated());
    */
  }

  /**
   *
   * @returns {boolean}
   */
  isUserAuthenticated(): boolean
  {
    return this.userService.isAuthenticated();
  }
}
