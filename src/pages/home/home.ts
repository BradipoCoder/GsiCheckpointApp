import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';

import {LoginPage} from "../login/login";

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {
    loginPage: any;
    loginPageParams: Object;

  constructor(public navCtrl: NavController) {
      this.loginPage = LoginPage;
      this.loginPageParams = {xxx:123, yyy:456};
  }

}
