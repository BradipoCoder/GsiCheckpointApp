import {Component, OnInit, OnDestroy} from '@angular/core';
import {Platform, NavController, ToastController, LoadingController} from 'ionic-angular';
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
  private currentOperationDuration: string = "";

  protected presentLogoutScreen: boolean = false;

  private auto_update_timeout: number;

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
    , private loadingCtrl: LoadingController
    , public userService: UserService
    , public codeScanService: CodeScanService
    , public remoteDataService: RemoteDataService
    , public offlineCapableRestService: OfflineCapableRestService)
  {
  }

  /**
   *@todo: !!!missing important controls!!!
   *  1) cannot scan anything if we are NOT checked in!
   *  2) cannot check the same code twice in a row
   *
   * @param {[<string>]} allowedTypes
   */
  scanQRCode(allowedTypes: any): void
  {
    let loader;
    let barcodeData: any;
    let checkin: Checkin;
    this.codeScanService.scanQR({allowed_types: allowedTypes}).then((data) =>
    {
      barcodeData = data;
      //console.log("BARCODE", barcodeData);
      loader = this.loadingCtrl.create({
        content: "Ricerca locale(" + barcodeData.text + ") in corso...",
        duration: (30 * 1000)
      });
      return loader.present();
    }).then(() =>
    {

      return this.remoteDataService.storeNewCheckin(barcodeData.text);
    }).then((newCheckin) =>
    {
      checkin = newCheckin;
      return loader.dismiss();
    }).then(() =>
    {
      console.log("CHECKIN REGISTERED", checkin);

      let toastMessage = "Sei entrato in: " + checkin.name + "(" + barcodeData.text + ")";
      if (checkin.type == Checkpoint.TYPE_OUT)
      {
        // OUT
        toastMessage = "Fine turno";
      } else if (checkin.type == Checkpoint.TYPE_OUT)
      {
        // IN
        toastMessage = "Inizio turno";
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
      if (!_.isUndefined(loader))
      {
        loader.dismiss();
      }
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
  activatePause(): void
  {

    this.remoteDataService.storeNewCheckin("PAUSA").then((checkin: Checkin) =>
    {
      console.log("CHECKIN REGISTERED", checkin);
    }).catch((e) =>
    {
      console.error("Errore pausa: " + e);

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
  registerNewTask(): void
  {
    let toast = this.toastCtrl.create({
      message: "Questa funzionalità non è ancora implementata.",
      duration: 3000,
      position: 'top'
    });
    toast.present();
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
    try
    {
      return this.remoteDataService.getSessionInOutOperation().type == Checkpoint.TYPE_IN;
    } catch (e)
    {
      return false;
    }
  }

  /**
   *
   * @returns {boolean}
   */
  isUserHavingABreak(): boolean
  {
    try
    {
      return this.remoteDataService.getLastOperation().type == Checkpoint.TYPE_PAUSE;
    } catch (e)
    {
      return false;
    }
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

    let sessionCheckins = self.remoteDataService.getCurrentSessionCheckins();
    if (_.size(sessionCheckins) > 0)
    {
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
    let sessionCheckins = self.remoteDataService.getCurrentSessionCheckins();
    if (_.size(sessionCheckins) > 0)
    {
      let lastCheckin: Checkin = _.first(sessionCheckins) as Checkin;
      if (!_.isUndefined(lastCheckin))
      {
        lastCheckin.setDurationFromNow();

        this.currentOperationDuration = lastCheckin.getFormattedDuration();
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
    console.log("HOME INIT");

    this.autoUpdateIntevalExecution(this);

    self.is_network_connected = this.offlineCapableRestService.isNetworkConnected();

    this.offlineCapableRestService.networkConnectedObservable.subscribe(
      function (is_network_connected)
      {
        console.log('Connection state: ' + is_network_connected);
        self.is_network_connected = is_network_connected;

        if (is_network_connected)
        {
          self.remoteDataService.triggerProviderDataSync(true).then(() =>
          {
            //console.log("AFTER NETWORK ON DATA SYNC OK");
            return self.remoteDataService.updateCurrentSessionCheckins();
          }).then(() =>
          {
            //console.log("AFTER NETWORK ON DATA SYNC OK - #2");
          });
        }
      });

    if (!this.isUserAuthenticated())
    {
      console.log("H-INIT - user is not logged in...");
      //@todo: this would need an observable in userService to be notified on user login/logout status
      this.userService.autologin();
    }
  }


  /**
   *
   */
  ngOnDestroy(): void
  {
    if (this.auto_update_timeout)
    {
      clearTimeout(this.auto_update_timeout);
    }
  }
}
