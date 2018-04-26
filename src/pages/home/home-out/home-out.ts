import {Component, OnDestroy, OnInit} from '@angular/core';
import {IonicPage, NavController, Platform, ToastController} from 'ionic-angular';
import {UserService} from "../../../services/user.service";
import {LogService} from '../../../services/log.service';
import {RemoteDataService} from '../../../services/remote.data.service';
import {CodeScanService} from '../../../services/code.scan.service';
import {Checkin} from "../../../models/Checkin";
import * as moment from "moment";

//import _ from "lodash";

@IonicPage()
@Component({
  selector: 'page-home-out',
  template: `
    <ion-content text-center class="custom-background paused">
      <ion-grid text-center>
        <ion-row>
          <ion-col>
            <div class="user-avatar-wrapper">
              <!--<img [src]="userService.getUserData('avatar_uri')">-->
              <img src="assets/image/user.png">
            </div>
          </ion-col>
        </ion-row>
        <ion-row>
          <ion-col>
            <h1>{{greeting}}</h1>
          </ion-col>
        </ion-row>
        <ion-row>
          <ion-col color="darkest">
            <ion-label>{{phrase1}}</ion-label>
            <!--<ion-label>Oggi {{getTodaysDate("D MMMM")}} hai lavorato<br/>{{shiftTotalDuration}}</ion-label>-->
          </ion-col>
        </ion-row>
        <ion-row>
          <ion-col color="darkest">
            Scansiona il <strong>QR code d'ingresso</strong> per iniziare la tua giornata lavorativa.
          </ion-col>
        </ion-row>
        <ion-row>
          <ion-col color="darkest">
            <button class="scan" ion-fab color="yellow-light" (tap)="scanQRCode(['IN'])">
              <ion-icon ios="md-qr-scanner" md="md-qr-scanner"></ion-icon>
            </button>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>
  `
})
export class HomeOutPage implements OnInit, OnDestroy
{
  private lastCheckout: Checkin;

  private greeting:string;
  private phrase1:string;

  constructor(protected navCtrl: NavController
    , protected platform: Platform
    , protected toastCtrl: ToastController
    , protected codeScanService: CodeScanService
    , protected userService: UserService
    , protected remoteDataService: RemoteDataService)
  {
    this.greeting = 'Ciao stranger!';
    this.phrase1 = '';
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


  ngOnInit(): void
  {
    try
    {
      this.lastCheckout = this.remoteDataService.getLastOperation();
      let lastCheckoutDate = moment(this.lastCheckout.checkin_date);
      let minutesPassed = moment().diff(lastCheckoutDate, 'minutes');
      let loggedOutRecently = (minutesPassed < 180);

      LogService.log("MIN PASSES: " + minutesPassed);

      if(loggedOutRecently) {
        this.greeting = 'Arrivederci '
      } else {
        this.greeting = 'Ciao '
      }
      let name = this.userService.getUserData("first_name") || this.userService.getUserData("name");
      this.greeting += name;


      if(loggedOutRecently) {
        this.phrase1 = 'Hai segnalato la tua uscita alle '
          + this.lastCheckout.getFormattedCheckinDate('HH:mm')
          + '.';
      } else {
        this.phrase1 = 'La tua ultima uscita è stata il '
          + this.lastCheckout.getFormattedCheckinDate('DD/MM/YYYY')
          + ' alle '
          + this.lastCheckout.getFormattedCheckinDate('HH:mm')
          + '.';
      }


    } catch (e)
    {
      //REBOOT
      window.location.href = "/";
    }
  }

  ngOnDestroy(): void
  {
    //
  }
}
