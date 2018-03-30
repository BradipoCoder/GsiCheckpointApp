/* Import: Core */
import {Component, OnInit, OnDestroy} from '@angular/core';
import {NavController} from 'ionic-angular';
/* Import: services */
import {LogService} from "../../services/log.service";
import {UserService} from '../../services/user.service';
/* Import: pages */
import {HomeNoConfPage} from './home-no-conf/home-no-conf';
import {HomeCheckinlistPage} from './home-checkinlist/home-checkinlist';
import {ConfigurationPage} from "../configuration/configuration";
/* Import: utilities */
//import _ from "lodash";

@Component({
  selector: 'page-home',
  template: `
    <ion-content text-center>
      <button ion-button margin-top color="not-so-danger" (click)="testActionOne()">
        Test
      </button>
      <div class="spinner">
        <img width="398" height="598" src="assets/image/spinner.gif" />
      </div>
    </ion-content>
  `
})
export class HomePage implements OnInit, OnDestroy
{
  constructor(protected navCtrl: NavController
    ,protected userService: UserService)
  {
  }

  /**
   * @todo: remove me!
   */
  testActionOne(): void
  {
    this.navCtrl.push(HomeNoConfPage).then(() => {
      this.navCtrl.setRoot(HomeNoConfPage);
    });
  }

  /**
   * @description Check if application has been configured for use
   *
   * @var self.userService.is_user_configured
   *
   * @returns {Promise<any>}
   */
  checkApplicationConfiguration(): Promise<any>
  {
    let self = this;
    return new Promise((resolve) => {
      if(!self.userService.is_user_configured)
      {
        self.navCtrl.push(HomeNoConfPage).then(() => {
          return self.navCtrl.setRoot(HomeNoConfPage);
        }).then(() => {
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * @description Check if user has initiated a new checkin code registration
   *
   * @var self.userService.is_user_configured
   *
   * @returns {Promise<any>}
   */
  checkNewCodeRegistration(): Promise<any>
  {
    let self = this;
    return new Promise((resolve) => {
      if(false)
      {
        // self.navCtrl.push(HomeNoConfPage).then(() => {
        //   return self.navCtrl.setRoot(HomeNoConfPage);
        // }).then(() => {
        //   resolve();
        // });
      } else {
        resolve();
      }
    });
  }

  /**
   * Go to checkin list page
   */
  goToCheckinListPage(): void
  {
    //this.navCtrl.push(HomeCheckinlistPage).then(() => {
      this.navCtrl.setRoot(HomeCheckinlistPage);
    //});
  }

  ngOnInit(): void
  {
    this.checkApplicationConfiguration().then(() => {
      return this.checkNewCodeRegistration();
    }).then( () => {
      return this.navCtrl.setRoot(HomeCheckinlistPage);
    }).then(() => {
      LogService.log("HOME INIT DONE.");
    });
  }

  ngOnDestroy(): void
  {
    //
  }
}
