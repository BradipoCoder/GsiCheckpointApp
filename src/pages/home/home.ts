/* Import: Core */
import {Component} from '@angular/core';
import {NavController} from 'ionic-angular';
/* Import: pages */
import {HomeNoConfPage} from 'home-no-conf/home-no-conf';
/* Import: utilities */
//import _ from "lodash";

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage
{
  constructor(protected navCtrl: NavController)
  {
  }


  goToCtrlOne(): void
  {
    this.navCtrl.push(HomeNoConfPage).then(() => {
      this.navCtrl.setRoot(HomeNoConfPage);
    });
  }

  goToCtrlTwo(): void
  {
    this.navCtrl.push(HomeNoConfPage).then(() => {
      this.navCtrl.setRoot(HomeNoConfPage);
    });
  }

}
