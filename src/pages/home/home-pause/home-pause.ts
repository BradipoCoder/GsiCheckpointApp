import {Component, OnInit, OnDestroy} from '@angular/core';
import {NavController, Platform, ToastController} from 'ionic-angular';
import {LogService} from '../../../services/log.service';
import {RemoteDataService} from '../../../services/remote.data.service';
import {CodeScanService} from '../../../services/code.scan.service';
import {HomePage} from "../home";
import {Checkin} from "../../../models/Checkin";
//import _ from "lodash";

@Component({
  selector: 'page-home-pause',
  template: `
    <ion-header>
      <div class="custom-background paused">

        <ion-grid padding class="header-content">
          <ion-row>
            <ion-col class="message" col-12>
              <p>Sei in pausa da</p>
              <h3 class="workshift-duration">
                <ion-label color="lightest">
                  {{currentOperationDuration}}
                </ion-label>
              </h3>
            </ion-col>
          </ion-row>

          <div class="buttons">
            <ion-fab bottom right class="qr-scan-fab">
              <button ion-fab color="yellow-light" (tap)="scanQRCode(['CHK'])">
                <ion-icon ios="md-qr-scanner" md="md-qr-scanner"></ion-icon>
              </button>
            </ion-fab>
          </div>

        </ion-grid>
        
        
      </div>
    </ion-header>
    
    <ion-content text-center class="custom-background paused">      
      <ion-grid margin-top>        
        <ion-row>
          <ion-col color="darkest">
            Per ricominciare il lavoro <strong>scansiona nuovamente</strong> il QR code dell'ambiente da pulire.
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>
  `
})
export class HomePausePage implements OnInit, OnDestroy
{
  protected currentOperationDuration:string;

  private auto_update_timeout:number;


  constructor(protected navCtrl: NavController
    , protected platform: Platform
    , protected toastCtrl: ToastController
    , protected codeScanService: CodeScanService
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

  recalculateLastCheckinDuration(self:HomePausePage): void
  {
    LogService.log("pause - refresh...");
    let pauseCheckin = self.remoteDataService.getLastOperation();
    pauseCheckin.setDurationFromNow();
    self.currentOperationDuration = pauseCheckin.getFormattedDuration();
    //LogService.log(JSON.stringify(pauseCheckin));
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
    this.recalculateLastCheckinDuration(this);
    this.auto_update_timeout = setInterval(this.recalculateLastCheckinDuration, (5 * 1000), this);
  }

  ngOnDestroy(): void
  {
    clearInterval(this.auto_update_timeout);
    this.auto_update_timeout = null;
  }
}
