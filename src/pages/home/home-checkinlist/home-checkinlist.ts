/* Import: Core */
import {Component, OnDestroy, OnInit} from '@angular/core';
import {IonicPage, App, NavController, Platform, ToastController} from 'ionic-angular';
/* Import: services */
import {LogService} from "../../../services/log.service";
import {UserService} from '../../../services/user.service';
import {RemoteDataService} from '../../../services/remote.data.service';
import {CodeScanService} from '../../../services/code.scan.service';
/* Import: models */
import {Checkin} from "../../../models/Checkin";
/* Import: utilities */
import _ from "lodash";
import * as moment from 'moment';


@IonicPage()
@Component({
  selector: 'page-home-checkinlist',
  template: `
    <ion-header>
      <ion-navbar padding-right>
        <button ion-button menuToggle>
          <ion-icon name="menu"></ion-icon>
        </button>
        <ion-title float-left>Home</ion-title>
        <ion-label float-right>{{userService.getUserData("first_name") ||
        userService.getUserData("name")}}
        </ion-label>
      </ion-navbar>

      <ion-grid padding class="header-content">
        <ion-row>
          <ion-col class="message" col-12>
            <p>Stai lavorando da</p>
            <h3 class="workshift-duration">
              <ion-label color="lightest">
                {{shiftTotalDuration}}
              </ion-label>
            </h3>
          </ion-col>
        </ion-row>

        <div class="buttons">
          <ion-fab bottom right class="qr-scan-fab">
            <button ion-fab color="yellow-light" (tap)="scanQRCode(['CHK', 'OUT'])">
              <ion-icon ios="md-qr-scanner" md="md-qr-scanner"></ion-icon>
            </button>
          </ion-fab>

          <ion-fab bottom right class="qr-scan-fab exit" *ngIf="!isMobileDevice()">
            <button ion-fab mini color="danger" (tap)="scanQRCode(['OUT'])">
              <ion-icon ios="md-qr-scanner" md="md-qr-scanner"></ion-icon>
            </button>
          </ion-fab>
        </div>

      </ion-grid>
    </ion-header>

    <ion-content class="checkinlist">
      <ion-grid class="checkin_list">

        <ion-row class="title">
          <ion-col>
            <h5>Clicca il pulsante per scansionare</h5>
          </ion-col>
        </ion-row>

        <ion-row *ngFor="let checkin of checkins; let isFirstRow=first;" [ngClass]="{'first' : isFirstRow}">
          <ion-col class="left" col-9>

            <span class="name">
              <ion-icon [name]="checkin.icon" item-left></ion-icon>
              {{checkin.name}}
            </span>

              <span class="duration" *ngIf="isFirstRow">({{checkin.getFormattedDuration(displaySeconds)}})</span>

              <span class="checklist_mod" *ngIf="isFirstRow && checkin.isCheckpointChecklistAvailable()" (click)="modifyCheckin(checkin)">
                  <ion-icon name="create"></ion-icon>
                  <span>modifica rifornimento</span>
              </span>
            
              <span *ngIf="userService.isTrustedUser()">
                [ {{checkin.getFormattedCheckinDate()}} ]
              </span>
            
          </ion-col>
          <ion-col class="right" col-3 text-right="">
            <div>
            <span class="time">
              {{checkin.getDatePropertyValue('checkin_date', 'H:mm')}}
            </span>
              <ion-icon *ngIf="userService.isTrustedUser()"
                        [name]="checkin.sync_state == 'in-sync' ? 'cloud-done' : 'sync'" item-right></ion-icon>
            </div>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>

    <ion-footer>
      <ion-grid padding-left padding-right>
        <ion-row>
          <ion-col text-left>
            <ion-label class="button" float-left padding-right (tap)="registerNewTask()">
              <ion-icon name="text"></ion-icon>
              Segnala
            </ion-label>
            <ion-label class="button" float-left padding-right (tap)="activatePause()">
              <ion-icon name="pause"></ion-icon>
              Pausa
            </ion-label>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-footer>
  `
})
export class HomeCheckinlistPage implements OnInit, OnDestroy
{
  private checkins: Checkin[];

  private shiftTotalDuration: string = "";

  private displaySeconds: boolean = false;

  private auto_update_timeout: number;

  constructor(protected appCtrl: App
    , protected platform: Platform
    , protected navCtrl: NavController
    , protected toastCtrl: ToastController
    , protected remoteDataService: RemoteDataService
    , protected codeScanService: CodeScanService
    , protected userService: UserService)
  {
  }

  /**
   *
   * @param {string[]} allowedTypes
   */
  public scanQRCode(allowedTypes: any): void
  {
    this.codeScanService.scanQR({allowed_types: allowedTypes}).then((barcode) => {
      LogService.log("SCANNED BARCODE: " + barcode);
      this.navCtrl.setRoot("HomePage").then(() => {
        LogService.log("Reset home call done.");
      });
    }, (e) => {
      let toast = this.toastCtrl.create({
        message: e,
        duration: 3000,
        position: 'top'
      });
      toast.present();
    });
  }

  /**
   *
   * @param {Checkin} checkin
   */
  protected modifyCheckin(checkin: Checkin)
  {
    this.remoteDataService.setCheckinToModify(checkin);
    this.navCtrl.setRoot("HomePage");
  }

  /**
   * Register PAUSE type checkin
   */
  protected activatePause(): void
  {
    this.remoteDataService.storePauseCheckin().then(() => {
      LogService.log("PAUSE REGISTERED");
      this.navCtrl.setRoot("HomePage");
    }).catch((e) => {
      LogService.log("Errore pausa: " + e, LogService.LEVEL_ERROR);
      let toast = this.toastCtrl.create({
        message: e,
        duration: 3000,
        position: 'top'
      });
      toast.present();
    });
  }

  /**
   *
   */
  protected registerNewTask(): void
  {
    //let navs = this.appCtrl.getRootNavs();
    //let rootNav = navs.pop();
    //rootNav.push(TaskNewPage);
    LogService.log("Coming soon...");
  }

  /**
   *
   * @returns {boolean}
   */
  protected isMobileDevice(): boolean
  {
    return !this.platform.is("core");
  }

  //-------------------------------------------------------------------------------------------------------------REFRESH
  /**
   *
   * @returns {Promise<any>}
   */
  private refreshAllCheckins(): Promise<any>
  {
    let self = this;
    return new Promise((resolve, reject) => {
      self.remoteDataService.updateCurrentSessionCheckins().then(() => {
        self.checkins = self.remoteDataService.getCurrentSessionCheckins();
        resolve();
      }, (e) => {
        reject(e);
      });
    });
  }

  //-----------------------------------------------------------------------------------------------------------INTERVALS
  /**
   * @param {HomeCheckinlistPage} self
   */
  recalculateShiftTotalDuration(self: HomeCheckinlistPage): void
  {
    let hours, minutes, seconds;
    let durationStr = '';
    if (_.size(self.checkins) > 0)
    {
      let shiftStartCheckin: Checkin = _.last(self.checkins) as Checkin;
      let shiftStartCheckinDuration = moment().diff(shiftStartCheckin.checkin_date, "seconds");

      hours = Math.floor(shiftStartCheckinDuration / 60 / 60);
      minutes = Math.floor(shiftStartCheckinDuration / 60) - (60 * hours);
      if (self.displaySeconds)
      {
        seconds = shiftStartCheckinDuration - (60 * 60 * hours) - (60 * minutes);
      }

      if (hours)
      {
        durationStr += hours + " " + (hours > 1 ? "ore" : "ora") + " ";
      }
      durationStr += minutes + " min";
      if (self.displaySeconds)
      {
        durationStr += " " + seconds + "s";
      }
    }

    self.shiftTotalDuration = durationStr;
  }

  /**
   * @param {HomeCheckinlistPage} self
   */
  recalculateLastCheckinDuration(self: HomeCheckinlistPage): void
  {
    if (_.size(self.checkins) > 0)
    {
      let lastCheckin: Checkin = _.first(self.checkins) as Checkin;
      if (!_.isUndefined(lastCheckin))
      {
        lastCheckin.setDurationFromNow();
      }
    }
  }

  /**
   * @param {HomeCheckinlistPage} self
   */
  private autoUpdateIntevalExecution(self: HomeCheckinlistPage): void
  {
    self.recalculateShiftTotalDuration(self);
    self.recalculateLastCheckinDuration(self);
    //LogService.log("tick...");
  }

  //------------------------------------------------------------------------------------------------------INIT & DESTROY
  ngOnInit(): void
  {
    let self = this;
    this.refreshAllCheckins().then(() => {
      self.autoUpdateIntevalExecution(self);
      self.auto_update_timeout = setInterval(self.autoUpdateIntevalExecution, (5 * 1000), self);
    }, (e) => {
      LogService.error(e, "CHECKINLIST NGInit");
    });
  }

  ngOnDestroy(): void
  {
    clearInterval(this.auto_update_timeout);
    this.auto_update_timeout = null;
  }
}

