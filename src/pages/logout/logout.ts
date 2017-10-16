import {Component} from '@angular/core';
import {NavController} from 'ionic-angular';
import {UserService} from '../../services/user.service';
import {HomePage} from '../home/home'
import {LogService} from "../../services/log.service";

@Component({
  selector: 'page-logout',
  templateUrl: 'logout.html'
})
export class LogoutPage
{

  /**
   *
   * @param {NavController} navCtrl
   * @param {UserService} userService
   */
  constructor(public navCtrl: NavController
    , private userService: UserService)
  {
  }

  /**
   * Log out
   */
  public logout(): void
  {
    this.userService.logout().then(() => {
      LogService.log("Now logged out");
      this.userService.initialize().then(() => {
        LogService.log("Init done");
        this.navCtrl.push(HomePage).then(() => {
          LogService.log("Going home #1");
          this.navCtrl.setRoot(HomePage).then(() => {
            LogService.log("Going home #2");
          });
        });
      });
    });
  }

}
