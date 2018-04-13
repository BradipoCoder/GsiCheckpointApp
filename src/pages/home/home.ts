/* Import: Core */
import {Component, OnInit, OnDestroy} from '@angular/core';
import {NavController} from 'ionic-angular';
/* Import: services */
import {LogService} from "../../services/log.service";
import {UserService} from '../../services/user.service';
import {CodeScanService} from '../../services/code.scan.service';
/* Import: pages */
import {HomeNoConfPage} from './home-no-conf/home-no-conf';
import {HomeCodeRegPage} from './home-code-reg/home-code-reg';
import {HomeCheckinlistPage} from './home-checkinlist/home-checkinlist';
import {ConfigurationPage} from "../configuration/configuration";
/* Import: utilities */
//import _ from "lodash";

@Component({
  selector: 'page-home',
  template: `
    <ion-content text-center>
      <!--<button ion-button margin-top color="not-so-danger" (click)="testActionOne()">-->
        <!--Test-->
      <!--</button>-->
      <div class="spinner">
        <img width="71" height="61" src="assets/image/spinner.gif" />
      </div>
    </ion-content>
  `
})
export class HomePage implements OnInit, OnDestroy
{
  constructor(protected navCtrl: NavController
    ,protected codeScanService: CodeScanService
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
  private checkIfApplicationIsConfiguration(): Promise<any>
  {
    let self = this;
    return new Promise((resolve, reject) => {
      if(!self.userService.is_user_configured)
      {
        LogService.error(new Error("L'applicazione non è stata ancora configurata."));
        return reject();
      } else {
        resolve();
      }
    });
  }

  /**
   * @description Check if user has initiated a new code registration
   *
   * @var self.userService.is_user_configured
   *
   * @returns {Promise<any>}
   */
  private checkIfCodeRegistrationIsInProgress(): Promise<any>
  {
    let self = this;
    return new Promise((resolve, reject) => {
      if(self.codeScanService.isCodeScanInProgress())
      {
        //reject(new Error("CODE REG IN PROGRESS"));
        this.navCtrl.setRoot(HomeCodeRegPage);

      } else {
        resolve();
      }
    });
  }

  ngOnInit(): void
  {
    this.checkIfApplicationIsConfiguration().then(() => {
      this.checkIfCodeRegistrationIsInProgress().then(() => {
        return this.navCtrl.setRoot(HomeCheckinlistPage).then(() => {
          LogService.log("HOME INIT DONE.");
        });
      }, (e) => {
        LogService.log("ROUTER: " + e);
        // go to code reg page
      });
    }, () => {
      this.navCtrl.setRoot(HomeNoConfPage).then(() => {
        //LogService.log("CONF PAGE REACHED.");
      });
    });
  }

  ngOnDestroy(): void
  {
    //
  }
}
