import {Component, OnInit, OnDestroy} from '@angular/core';
import {Platform, NavController, ToastController, LoadingController, AlertController} from 'ionic-angular';
import {UserService} from '../../services/user.service';
import {RemoteDataService} from '../../services/remote.data.service';
import {OfflineCapableRestService} from '../../services/offline.capable.rest.service';
import {CheckpointProvider} from "../../providers/checkpoint.provider";
import {CheckinProvider} from "../../providers/checkin.provider";
import {CodeScanService} from '../../services/code.scan.service';
import {Checkpoint} from '../../models/Checkpoint';
import {Checkin} from "../../models/Checkin";
import {HomeCheckinViewPage} from './home.checkin.view';
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
    , private alertCtrl: AlertController
    , public userService: UserService
    , public codeScanService: CodeScanService
    , public remoteDataService: RemoteDataService
    , public offlineCapableRestService: OfflineCapableRestService
    , public checkpointProvider: CheckpointProvider
    , public checkinProvider: CheckinProvider)
  {
  }

  /**
   * Scan QR code and find corresponding Checkpoint for it
   * IF OK - call registration method
   * @param {[<string>]} allowedTypes
   */
  public scanQRCode(allowedTypes: any): void
  {
    let loader;
    let barcodeText: any;
    let checkpoint: Checkpoint;

    this.recalculateShiftTotalDuration(this);
    this.recalculateLastCheckinDuration(this);

    this.codeScanService.scanQR({allowed_types: allowedTypes}).then((barcodeData) => {
      barcodeText = barcodeData.text;
      LogService.log("BARCODE: " + barcodeText);

      loader = this.loadingCtrl.create({
        content: "Ricerca locale in corso: " + barcodeText,
        duration: (15 * 1000)
      });

      loader.onDidDismiss(() => {
        if (_.isEmpty(checkpoint))
        {
          LogService.log("Unable to find checkpoint for barcode!", LogService.LEVEL_ERROR);
        } else
        {
          this.registerNewCheckinForCheckpoint(checkpoint).then(() => {
            LogService.log('registration OK');
          }, (e) => {
            LogService.log('registration FAIL: ' + e);
          });
        }
      });

      return loader.present();
    }).then(() => {
      LogService.log("Looking for bardoce: " + barcodeText);
      return this.checkpointProvider.getCheckpoint({selector: {code: barcodeText}});
    }).then((relativeCheckpoint) => {
      checkpoint = relativeCheckpoint;
      loader.dismiss();
    }).catch((e) => {
      LogService.log("Errore scansione: " + e, LogService.LEVEL_ERROR);

      if (!_.isUndefined(loader))
      {
        loader.dismiss();
      }

      let alert = this.alertCtrl.create({
        title: 'ERRORE SCANSIONE',
        subTitle: e,
        buttons: [
          {
            text: 'OK',
            handler: () => {
              /*LogService.log('OK clicked');*/
            }
          }
        ]
      });

      alert.present();
    });
  }

  /**
   * @todo: !!!missing important controls!!!
   *  1) cannot scan anything if we are NOT checked in!
   *  2) cannot check the same code twice in a row
   *
   * @param {Checkpoint} checkpoint
   * @returns {Promise<any>}
   */
  protected registerNewCheckinForCheckpoint(checkpoint:Checkpoint): Promise<any>
  {
    let self = this;
    let loader;

    return new Promise(function (resolve, reject) {
      LogService.log("Registering CP["+checkpoint.code+"]: " + checkpoint.name);

      self.presentCheckpointChecklistSelector(checkpoint).then((selectedValues) => {
        loader = self.loadingCtrl.create({
          content: "Salvataggio in corso...",
          duration: (3 * 1000)
        });
        loader.present();


        //@todo: pass selected values to store method
        LogService.log('Checkbox selected data:' + JSON.stringify(selectedValues));


        return self.remoteDataService.storeNewCheckinForCheckpoint(checkpoint, selectedValues);
      }).then((checkin: Checkin) => {
        let msg = "Sei entrato in: [" + checkin.code + "] " + checkin.name;

        if (checkin.type == Checkpoint.TYPE_OUT)
        {
          msg = "Fine turno";
          self.presentLogoutScreen = true;
        } else if (checkin.type == Checkpoint.TYPE_IN)
        {
          self.presentLogoutScreen = false;
          msg = "Inizio turno";
        }
        loader.setContent(msg);
        resolve(checkin);
      }, (e) => {
        if (!_.isUndefined(loader))
        {
          loader.dismiss();
        }
        reject(e);
      }).catch((e) => {
        if (!_.isUndefined(loader))
        {
          loader.dismiss();
        }
        reject(e);
      });
    });
  }

  /**
   *
   * @param {Checkpoint} checkpoint
   * @returns {Promise<any>}
   */
  protected presentCheckpointChecklistSelector___PAGE(checkpoint:Checkpoint):Promise<any>
  {
    let self = this;

    return new Promise(function (resolve, reject) {

      if(!checkpoint.hasChecklistValues()) {
        resolve();
        return;
      }

      self.remoteDataService.HomeCheckinViewPageData = {
        promise_resolve: resolve,
        promise_reject: reject,
        checkpoint: checkpoint
      };

      self.navCtrl.push(HomeCheckinViewPage).then(() => {
        self.navCtrl.setRoot(HomeCheckinViewPage).then(() => {
          //HomeCheckinViewPage will pick up the promise and resolve it from there
        });
      });
    });
  }

  /**
   *
   * @param {Checkpoint} checkpoint
   * @returns {Promise<any>}
   */
  protected presentCheckpointChecklistSelector(checkpoint:Checkpoint):Promise<any>
  {
    let self = this;
    let alert;

    return new Promise(function (resolve, reject) {

      if(!checkpoint.hasChecklistValues()) {
        resolve();
        return;
      }

      alert = self.alertCtrl.create({
        title: 'RIFORNIMENTI',
        subTitle: 'clicca sulle voci che hai rifornito',
      });

      _.each(checkpoint.checklist_items, (label, key) => {
        alert.addInput({
          type: 'checkbox',
          label: label,
          value: key,
        });
      });

      alert.addButton({
        text: 'Cancel',
        handler: () => {
          LogService.log("Cancel");
          resolve([]);
        }
      });

      alert.addButton({
        text: 'Fatto',
        handler: (data) => {
          resolve(data);
        }
      });

      alert.present();
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
    this.navCtrl.push(ConfigurationPage).then(() => {
      this.navCtrl.setRoot(ConfigurationPage);
    });
  }

  /**
   * Checkin details page with checklis selection

  goToCheckinViewPage(): void
  {
    this.navCtrl.push(HomeCheckinViewPage).then(() => {
      this.navCtrl.setRoot(HomeCheckinViewPage).then(() => {

      });
    });
  }
*/

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
        }, () => {
          //
        });
      }
    });

    this.refreshHomeData().then(() => {
      this.autoUpdateIntevalExecution(this);
    }, () => {
      //
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
