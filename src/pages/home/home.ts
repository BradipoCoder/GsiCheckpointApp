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
import {Checkin} from "../../models/Checkin";

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage implements OnInit, OnDestroy
{
  public is_network_connected: boolean;

  private shiftTotalDuration: string = "";

  protected presentLogoutScreen: boolean = false;

  private auto_update_timeout:number;

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
      //console.log("BARCODE", barcodeData);
      return this.remoteDataService.storeNewCheckin(barcodeData.text);
    }).then((newCheckin) =>
    {
      console.log("CHECKIN REGISTERED", newCheckin);

      let toastMessage = newCheckin.name;
      if (newCheckin.type == Checkpoint.TYPE_OUT)
      {
        // OUT
        toastMessage = "Fine turno";

      } else if (newCheckin.type == Checkpoint.TYPE_OUT)
      {
        // IN
        toastMessage = "Inizio turno";
      } else
      {
        // CHK
      }

      let toast = this.toastCtrl.create({
        message: toastMessage,
        duration: 3000,
        position: 'bottom'
      });
      toast.present();
    }).catch((e) =>
    {
      console.error("Errore scansione: " + e);
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

    if (self.isUserAuthenticated() && self.isUserCheckedIn())
    {
      let sessionCheckins = self.remoteDataService.getCurrentSessionCheckins();
      let shiftStartCheckin: Checkin = _.last(sessionCheckins) as Checkin;
      let shiftStartCheckinDuration = moment().diff(shiftStartCheckin.checkin_date, "seconds");

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

    self.shiftTotalDuration = durationStr;
  }

  /**
   * @param {HomePage} self
   */
  recalculateLastCheckinDuration(self: HomePage): void
  {

    if (self.isUserAuthenticated() && self.isUserCheckedIn())
    {
      let sessionCheckins = self.remoteDataService.getCurrentSessionCheckins();
      let lastCheckin: Checkin = _.first(sessionCheckins) as Checkin;
      if (!_.isUndefined(lastCheckin))
      {
        lastCheckin.setDurationFromNow();
      }
    }
  }

  /**
   * Auto-self-calling function
   * @param {HomePage} self
   */
  private autoUpdateIntevalExecution(self: HomePage): void
  {
    self.recalculateShiftTotalDuration(self);
    self.recalculateLastCheckinDuration(self);
    self.auto_update_timeout = setTimeout(self.autoUpdateIntevalExecution, (10 * 1000), self);

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
        /*@todo: this should not be here but in Remote Data Services!!!*/
        if (is_network_connected)
        {
          self.remoteDataService.triggerProviderDataSync(true).then(() => {
            console.log("AFTER NETWORK ON DATA SYNC OK");
            return self.remoteDataService.updateCurrentSessionCheckins();
          }).then(() => {
            console.log("AFTER NETWORK ON DATA SYNC OK - #2");
          });
        }
      });
  }


  /**
   *
   */
  ngOnDestroy(): void
  {
    if(this.auto_update_timeout)
    {
      clearTimeout(this.auto_update_timeout);
    }
  }
}
