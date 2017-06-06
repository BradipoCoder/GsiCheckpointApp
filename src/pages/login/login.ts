import {Component} from '@angular/core';
import {NavController} from 'ionic-angular';
import {UserService} from '../../services/user.service';

@Component({
  selector: 'page-login',
  templateUrl: 'login.html'
})
export class LoginPage
{
  private username:string;
  private password:string;

  constructor(public navCtrl: NavController
    , private userService: UserService)
  {
    this.username = "";
    this.password = "";
  }

  authenticate(): void
  {
    this.userService.authenticate(this.username, this.password);
  }

}
