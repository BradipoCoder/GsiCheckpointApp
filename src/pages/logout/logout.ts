import {Component} from '@angular/core';
import {NavController} from 'ionic-angular';
import {UserService} from '../../services/user.service';
import {HomePage} from '../home/home'

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
      console.log("Now logged out");
      this.userService.initialize().then(() => {
        console.log("Init done");
        this.navCtrl.push(HomePage).then(() => {
          console.log("Going home #1");
          this.navCtrl.setRoot(HomePage).then(() => {
            console.log("Going home #2");
          });
        });
      });
    });
  }

}
