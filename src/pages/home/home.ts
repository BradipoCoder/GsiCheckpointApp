import {Component, OnInit, OnDestroy} from '@angular/core';
import {Platform, NavController, ToastController} from 'ionic-angular';
import {Network} from '@ionic-native/network';
import {UserService} from '../../services/user.service';
import {RemoteDataService} from '../../services/remote.data.service';
import {OfflineCapableRestService} from '../../services/offline.capable.rest.service';
import {CodeScanService} from '../../services/code.scan.service';
import {Checkpoint} from '../../models/Checkpoint';
import {ConfigurationPage} from '../configuration/configuration';
/*import {Checkin} from '../../models/Checkin';*/
import _ from "lodash";
import * as moment from 'moment';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage implements OnInit, OnDestroy
{
  public is_network_connected:boolean;

  private shiftTotalDuration: string = "";

  protected presentLogoutScreen:boolean = false;

  /*
  private logoutScreenData:any = {
    name: "Andrea",
    img_url: "assets/image/user.png",
    date: "14 giugno",
    duration: "6 ore 22 min"
  };*/


  constructor(public navCtrl: NavController
    , private platform: Platform
    , private network: Network
    , public toastCtrl: ToastController
    , public userService: UserService
    , public codeScanService: CodeScanService
    , public remoteDataService: RemoteDataService
    , public offlineCapableRestService: OfflineCapableRestService)
  {
  }

  /**
   *
   * @param {[<string>]} allowedTypes
   */
  scanQRCode(allowedTypes: any): void
  {
    this.codeScanService.scanQR({allowed_types: allowedTypes}).then((barcodeData) =>
    {
      //this.lastScannedBarcode = JSON.stringify(barcodeData);
      this.remoteDataService.storeNewCheckin(barcodeData.text).then((newCheckinId) => {

        //user has just registered the EXIT checkin code
        if(!this.isUserCheckedIn())
        {

          //@todo: rethink this!
          let toast = this.toastCtrl.create({
            message: "!!!",
            duration: 10000,
            position: 'bottom'
          });
          toast.present();
          /*
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
          */


        } else {
          //let checkin = this.remoteDataService.getCheckin({id: newCheckinId});

          let toast = this.toastCtrl.create({
            message: "Cantina buia", /*checkin.name,*/
            duration: 3000,
            position: 'bottom'
          });
          toast.present();

        }
      }).catch((e) => {
        console.error("Errore registrazione: " + e);
        let toast = this.toastCtrl.create({
          message: e,
          duration: 3000,
          position: 'top'
        });
        toast.present();
      });
    }, (e) =>
    {
      console.error("Errore scansione codice: " + e);
      let toast = this.toastCtrl.create({
        message: e,
        duration: 3000,
        position: 'top'
      });
      toast.present();
    });
  }

  goToConfigurationPage(): void
  {
    this.navCtrl.push(ConfigurationPage);
    this.navCtrl.setRoot(ConfigurationPage);
  }

  /**
   *
   */
  isUserConfigured(): boolean
  {
    return this.userService.is_user_configured;
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
    /*
    if (self.isUserAuthenticated() && self.isUserCheckedIn())
    {
      let shiftStartCheckin = self.remoteDataService.getCheckin({type: Checkpoint.TYPE_IN});
      let shiftStartCheckinDuration = moment().diff(shiftStartCheckin.time, "seconds");

      let hours = Math.floor(shiftStartCheckinDuration / 60 / 60);
      let minutes = Math.floor(shiftStartCheckinDuration / 60) - (60 * hours);
      //let seconds = shiftStartCheckinDuration - (60 * 60 * hours) - (60 * minutes);
      //console.log("H: " + hours + "M: " + minutes + "S: " + seconds);

      if (hours)
      {
        durationStr += hours + " " + (hours > 1 ? "ore" : "ora") + " ";
      }
      durationStr += minutes + " min";
      //durationStr += " " + seconds + "s";
    }
    */
    self.shiftTotalDuration = durationStr;
  }

  /**
   * @param {HomePage} self
   */
  recalculateLastCheckinDuration(self: HomePage): void
  {
    /*
    if (self.isUserAuthenticated() && self.isUserCheckedIn())
    {
      let lastCheckin = self.remoteDataService.getLastCheckin();
      if(!_.isUndefined(lastCheckin))
      {
        lastCheckin.setDurationFromNow();
      }
    }*/
  }

  /**
   * Auto-self-calling function
   * @param {HomePage} self
   */
  private autoUpdateIntevalExecution(self: HomePage): void
  {
    self.recalculateShiftTotalDuration(self);
    self.recalculateLastCheckinDuration(self);
    setTimeout(self.autoUpdateIntevalExecution, 5000, self);
  }

  protected fakeNetworkStateChange()
  {
    this.offlineCapableRestService.setIsNetworkConnected(this.is_network_connected);
  }

  //------------------------------------------------------------------------------------------------------INIT & DESTROY
  ngOnInit(): void
  {
    let self = this;

    this.autoUpdateIntevalExecution(this);


    self.is_network_connected = this.offlineCapableRestService.isNetworkConnected();
    this.offlineCapableRestService.networkConnectedObservable.subscribe(
      function (is_network_connected)
      {
        console.log('Connection state: ' + is_network_connected);
        self.is_network_connected = is_network_connected;
      });
  }

  ngOnDestroy(): void
  {
    //
  }
}
