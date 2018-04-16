import {Component, OnInit, OnDestroy} from '@angular/core';
import {NavController, Platform, ToastController} from 'ionic-angular';
import {UserService} from "../../../services/user.service";
import {LogService} from '../../../services/log.service';
import {RemoteDataService} from '../../../services/remote.data.service';
import {CodeScanService} from '../../../services/code.scan.service';
import {HomePage} from "../home";
import {Checkin} from "../../../models/Checkin";
import {Checkpoint} from "../../../models/Checkpoint";

//import _ from "lodash";

@Component({
  selector: 'page-home-out',
  template: `
    <ion-content text-center class="custom-background paused">
      <ion-grid text-center>
        <ion-row>
          <ion-col>
            <div class="user-avatar-wrapper">
              <img [src]="userService.getUserData('avatar_uri')">
            </div>
          </ion-col>
        </ion-row>
        <ion-row>
          <ion-col>
            <h1>Arrivederci {{userService.getUserData("first_name") ||
            userService.getUserData("name")}}</h1>
          </ion-col>
        </ion-row>
        <ion-row>
          <ion-col color="darkest">
            <ion-label>Hai segnalato la tua uscita il {{lastCheckout.getFormattedCheckinDate()}}.</ion-label>
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
            <div class="buttons">
              <ion-fab bottom right class="qr-scan-fab">
                <button ion-fab color="yellow-light" (tap)="scanQRCode(['IN'])">
                  <ion-icon ios="md-qr-scanner" md="md-qr-scanner"></ion-icon>
                </button>
              </ion-fab>
            </div>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>
  `
})
export class HomeOutPage implements OnInit, OnDestroy
{

  private lastCheckout: Checkin;

  constructor(protected navCtrl: NavController
    , protected platform: Platform
    , protected toastCtrl: ToastController
    , protected codeScanService: CodeScanService
    , protected userService: UserService
    , protected remoteDataService: RemoteDataService)
  {
    //
  }

  /**
   *
   * @param {string[]} allowedTypes
   */
  public scanQRCode(allowedTypes: any): void
  {
    this.codeScanService.scanQR({allowed_types: allowedTypes}).then((barcode) => {
      LogService.log("SCANNED BARCODE: " + barcode);
      this.navCtrl.setRoot(HomePage).then(() => {
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
   * @returns {boolean}
   */
  protected isMobileDevice(): boolean
  {
    return !this.platform.is("core");
  }

  ngOnInit(): void
  {
    try
    {
      this.lastCheckout = this.remoteDataService.getLastOperation();
    } catch (e)
    {
      //
    }
  }

  ngOnDestroy(): void
  {
    //
  }
}
