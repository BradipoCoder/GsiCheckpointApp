import {Component, OnInit, OnDestroy} from '@angular/core';
import {Platform, NavController, ToastController, LoadingController} from 'ionic-angular';
import {UserService} from '../../services/user.service';
import {RemoteDataService} from '../../services/remote.data.service';
import {OfflineCapableRestService} from '../../services/offline.capable.rest.service';
import {CheckinProvider} from "../../providers/checkin.provider";
import {CodeScanService} from '../../services/code.scan.service';
import {Checkpoint} from '../../models/Checkpoint';
import {Checkin} from "../../models/Checkin";
import {ConfigurationPage} from '../configuration/configuration';
import _ from "lodash";
import * as moment from 'moment';
import {Subscription} from "rxjs/Subscription";
import {LogService} from "../../services/log.service";


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

  private is_refreshing = false;
  private lastRefresh;

  private networkStateSubscription: Subscription;
  private dataChangeSubscription: Subscription;


  constructor(public navCtrl: NavController
    , private platform: Platform
    , public toastCtrl: ToastController
    , private loadingCtrl: LoadingController
    , public userService: UserService
    , public codeScanService: CodeScanService
    , public remoteDataService: RemoteDataService
    , public offlineCapableRestService: OfflineCapableRestService
    , public checkinProvider: CheckinProvider)
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

    this.recalculateShiftTotalDuration(this);
    this.recalculateLastCheckinDuration(this);

    this.codeScanService.scanQR({allowed_types: allowedTypes}).then((data) => {
      barcodeData = data;
      //console.log("BARCODE", barcodeData);
      loader = this.loadingCtrl.create({
        content: "Ricerca locale(" + barcodeData.text + ") in corso...",
        duration: (30 * 1000)
      });
      return loader.present();
    }).then(() => {

      return this.remoteDataService.storeNewCheckin(barcodeData.text);
    }).then((newCheckin) => {
      checkin = newCheckin;
      return loader.dismiss();
    }).then(() => {
      LogService.log("CHECKIN REGISTERED: " +  JSON.stringify(checkin));

      let toastMessage = "Sei entrato in: " + checkin.name + "(" + barcodeData.text + ")";
      if (checkin.type == Checkpoint.TYPE_OUT)
      {
        // OUT
        toastMessage = "Fine turno";
        this.presentLogoutScreen = true;

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

      //timeout to hide end of session screen
      if (this.presentLogoutScreen)
      {
        setTimeout((self) => {
          LogService.log("time is up!");
          self.presentLogoutScreen = false;
        }, 15000, this);
      }

    }).catch((e) => {
      LogService.log("Errore scansione: " + e, LogService.LEVEL_ERROR);
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
   * Register PAUSE type checkin
   */
  activatePause(): void
  {
    this.remoteDataService.storeNewCheckin("PAUSA").then((checkin: Checkin) => {
      LogService.log("CHECKIN REGISTERED: " + JSON.stringify(checkin));
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
   * @param {string} [format]
   * @returns {string}
   */
  getTodaysDate(format = null): String
  {
    let m = moment();
    m.locale("it");
    return m.format(format);
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
      //LogService.log("H: " + hours + "M: " + minutes + "S: " + seconds);
      if (hours)
      {
        durationStr += hours + " " + (hours > 1 ? "ore" : "ora") + " ";
      }
      durationStr += minutes + " min";
      //durationStr += " " + seconds + "s";
    } else
    {
      LogService.log("NSC");
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
    } else
    {
      LogService.log("NSC");
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

  /**
   *
   * @param {boolean} state
   */
  protected fakeNetworkStateChange(state: boolean)
  {
    this.offlineCapableRestService.setIsNetworkConnected(state);
  }

  /**
   * @todo: we should implement an id based refresh where we substitute documents singularly
   * @todo: last triggered update could be skipped never updating to final list :....?
   *
   * @returns {Promise<any>}
   */
  private refreshHomeData(): Promise<any>
  {
    let self = this;

    return new Promise(function (resolve, reject) {

      if (self.is_refreshing)
      {
        return reject(new Error("Refresh is already on the way...(skipping)"));
      }

      let fiveSecondsAgo = moment().subtract(5, 'seconds');
      if (self.lastRefresh && self.lastRefresh.isAfter(fiveSecondsAgo))
      {
        return reject(new Error("Skipping refresh - too many!"));
      }

      self.is_refreshing = true;

      self.remoteDataService.updateCurrentSessionCheckins().then(() => {
        //LogService.warn("HOMEDATA refresh - done");
        self.lastRefresh = moment();
        self.is_refreshing = false;
        resolve();
      });
    });
  }

  //------------------------------------------------------------------------------------------------------INIT & DESTROY
  ngOnInit(): void
  {
    let self = this;

    this.is_network_connected = this.offlineCapableRestService.isNetworkConnected();

    this.networkStateSubscription = this.offlineCapableRestService.networkConnectedObservable.subscribe
    (
      (is_network_connected) => {
        LogService.log('Connection state: ' + is_network_connected);
        self.is_network_connected = is_network_connected;
      }
    );

    this.dataChangeSubscription = this.checkinProvider.databaseChangeObservable.subscribe
    ((data: any) => {
      if (_.includes(['checkpoint', 'checkin'], data.db))
      {
        LogService.log('HOME - DB CHANGE!');
        self.refreshHomeData().then(() => {
          self.autoUpdateIntevalExecution(self);
        });
      }
    });

    this.refreshHomeData().then(() => {
      this.autoUpdateIntevalExecution(this);
    });
  }


  /**
   *
   */
  ngOnDestroy(): void
  {
    this.networkStateSubscription.unsubscribe();
    this.dataChangeSubscription.unsubscribe();

    if (this.auto_update_timeout)
    {
      clearTimeout(this.auto_update_timeout);
    }
  }
}
