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


  constructor(public navCtrl: NavController
    , private userService: UserService)
  {

  }



  getUserId():string
  {
    return this.userService.getUserId();
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
