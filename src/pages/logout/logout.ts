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

  constructor(public navCtrl: NavController
    , private userService: UserService)
  {
  }

  logout(): void
  {
    this.userService.logout().then(() => {
      console.log("Now logged out");
      this.navCtrl.push(HomePage);
      this.navCtrl.setRoot(HomePage);
    });
  }
}
