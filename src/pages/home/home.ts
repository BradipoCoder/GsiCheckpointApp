import {Component, OnInit, OnDestroy} from '@angular/core';
import {Platform, NavController, ToastController} from 'ionic-angular';
import {UserService} from '../../services/user.service';
import {RemoteDataService} from '../../services/remote.data.service';
import {CodeScanService} from '../../services/code.scan.service';
import {Checkpoint} from '../../models/Checkpoint';
import {Checkin} from '../../models/Checkin';
import _ from "lodash";
import * as moment from 'moment';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage implements OnInit, OnDestroy
{
  private autoUpdateInterval = null;
  private shiftTotalDuration: string = "...";

  private presentLogoutScreen:boolean = false;
  private logoutScreenData:any = {
    name: "Andrea",
    img_url: "assets/image/user.png",
    date: "14 giugno",
    duration: "6 ore 22 min"
  };


  constructor(public navCtrl: NavController
    , private platform: Platform
    , public toastCtrl: ToastController
    , public userService: UserService
    , public codeScanService: CodeScanService
    , public remoteDataService: RemoteDataService)
  {
  }

  /**
   *
   * @param {string} expectedType
   */
  scanQRCode(expectedType: string): void
  {
    this.codeScanService.scanQR({expected_type: expectedType}).then((barcodeData) =>
    {
      //this.lastScannedBarcode = JSON.stringify(barcodeData);
      let toast = this.toastCtrl.create({
        message: "Hai scansionato: " + JSON.stringify(barcodeData),
        duration: 3000,
        position: 'top'
      });
      toast.present();
      this.remoteDataService.storeNewCheckin(barcodeData.text).then((newBarcodeId) => {

        if(!this.isUserCheckedIn())
        {
          //user has just registered the EXIT checkin code

          // 1) store user data (before logout) present logged-out screen
          this.logoutScreenData.name = this.userService.getUserData("first_name") || this.userService.getUserData("name");
          //this.logoutScreenData.img_url = this.userService.getUserData("img_url") || 'assets/image/user.png';
          moment.locale("it");
          this.logoutScreenData.date = moment().format('D MMMM');
          this.logoutScreenData.duration = this.shiftTotalDuration;
          this.presentLogoutScreen = true;

          // 2) start timeout to hide logged-out screen
          setTimeout(function(self) {
            self.presentLogoutScreen = false;
          }, 15 * 1000, this);

          // 3) log out user
          this.userService.logout().then(() => {
            console.log("User is now logged out.");
            //reinitialize remote data
            return this.remoteDataService.initialize();
          }).then(() => {
            console.log("Remote data service was reset.");
            //DONE
          });
        }
      }).catch((e) => {
        console.error("Barcode registration error: " + e);
        let toast = this.toastCtrl.create({
          message: e,
          duration: 3000,
          position: 'top'
        });
        toast.present();
      });
    }, (e) =>
    {
      console.error("Error scanning barcode: " + e);
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
  isUserAuthenticated(): boolean
  {
    return this.userService.isAuthenticated();
  }

  /**
   *
   * @returns {boolean}
   */
  isConnected(): boolean
  {
    return this.remoteDataService.isNetworkConnected();
  }

  /**
   *
   * @returns {boolean}
   */
  isUserCheckedIn(): boolean
  {
    return this.remoteDataService.getLastOperationType() == Checkpoint.TYPE_IN;
  }

  /**
   *
   * @returns {boolean}
   */
  isMobileDevice(): boolean
  {
    return !this.platform.is("core");
  }

  //-----------------------------------------------------------------------------------------------------------INTERVALS
  /**
   * @param {HomePage} self
   */
  recalculateShiftTotalDuration(self: HomePage): void
  {
    let durationStr = '';

    if (self.isUserAuthenticated() && self.isUserCheckedIn())
    {
      let shiftStartCheckin = self.remoteDataService.getCheckin({type: Checkpoint.TYPE_IN});
      let shiftStartCheckinDuration = moment().diff(shiftStartCheckin.time, "seconds");

      let hours = Math.floor(shiftStartCheckinDuration / 60 / 60);
      let minutes = Math.floor(shiftStartCheckinDuration / 60) - (60 * hours);
      let seconds = shiftStartCheckinDuration - (60 * 60 * hours) - (60 * minutes);
      //console.log("H: " + hours + "M: " + minutes + "S: " + seconds);

      if (hours)
      {
        durationStr += hours + " " + (hours > 1 ? "ore" : "ora") + " ";
      }
      durationStr += minutes + " min";
      //durationStr += " " + seconds + "s";
    }

    self.shiftTotalDuration = durationStr;
  }

  /**
   * @param {HomePage} self
   */
  recalculateLastCheckinDuration(self: HomePage): void
  {
    if (self.isUserAuthenticated() && self.isUserCheckedIn())
    {
      let lastCheckin = self.remoteDataService.getLastCheckin();
      if(!_.isUndefined(lastCheckin))
      {
        lastCheckin.setDurationFromNow();
      }
    }
  }

  /**
   * Called in a setInteval
   * @param {HomePage} self
   */
  private autoUpdateIntevalExecution(self: HomePage): void
  {
    self.recalculateShiftTotalDuration(self);
    self.recalculateLastCheckinDuration(self);
  }

  //------------------------------------------------------------------------------------------------------INIT & DESTROY
  ngOnInit(): void
  {
    console.log("HP ngINIT!");
    if (_.isNull(this.autoUpdateInterval))
    {
      this.autoUpdateInterval = setInterval(this.autoUpdateIntevalExecution, (5 * 1000), this);
    }
  }

  ngOnDestroy(): void
  {
    clearInterval(this.autoUpdateInterval);
    this.autoUpdateInterval = null;
  }
}
