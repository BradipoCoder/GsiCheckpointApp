import {Component, OnInit, OnDestroy} from '@angular/core';
import {
  App,
  Platform,
  NavController,
  ToastController,
  LoadingController,
  AlertController,
  ModalController
} from 'ionic-angular';
import {UserService} from '../../services/user.service';
import {RemoteDataService} from '../../services/remote.data.service';
import {OfflineCapableRestService} from '../../services/offline.capable.rest.service';
import {CheckpointProvider} from "../../providers/checkpoint.provider";
import {CheckinProvider} from "../../providers/checkin.provider";
import {CodeScanService} from '../../services/code.scan.service';
import {CrmDataModel} from '../../models/crm.data.model';
import {Checkpoint} from '../../models/Checkpoint';
import {Checkin} from "../../models/Checkin";
import {HomeCheckinViewPage} from './home.checkin.view';
import {TaskNewPage} from "../tasks/task.new";
import {HomeTaskViewPage} from "./home.task.view";
import {ConfigurationPage} from '../configuration/configuration';
import _ from "lodash";
import * as moment from 'moment';
import {Subscription} from "rxjs/Subscription";
import {LogService} from "../../services/log.service";
import {TaskProvider} from "../../providers/task.provider";
import {Task} from "../../models/Task";

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

  private is_refreshing = true;
  /* use this to put home screen in "UPDATING" state */
  private lastRefresh;

  private checkins: Checkin[];

  private networkStateSubscription: Subscription;
  private dataChangeSubscription_CHK: Subscription;
  private dataChangeSubscription_TASK: Subscription;


  constructor(protected appCtrl: App
    , protected alertCtrl: AlertController
    , protected checkinProvider: CheckinProvider
    , protected checkpointProvider: CheckpointProvider
    , protected codeScanService: CodeScanService
    , protected loadingCtrl: LoadingController
    , protected modalCtrl: ModalController
    , protected navCtrl: NavController
    , protected offlineCapableRestService: OfflineCapableRestService
    , protected platform: Platform
    , protected remoteDataService: RemoteDataService
    , protected toastCtrl: ToastController
    , protected taskProvider: TaskProvider
    , protected userService: UserService)
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
   * @param {Checkpoint} checkpoint
   * @returns {Promise<Checkin>}
   */
  protected registerNewCheckinForCheckpoint(checkpoint: Checkpoint): Promise<Checkin>
  {
    let self = this;
    let loader;
    let checkin: Checkin;

    return new Promise(function (resolve, reject) {
      LogService.log("Registering checkin for CP[" + checkpoint.code + "]: " + checkpoint.name);

      loader = self.loadingCtrl.create({
        content: "Salvataggio in corso...",
        duration: (3 * 1000)
      });

      loader.present().then(() => {
        return self.remoteDataService.storeNewCheckinForCheckpoint(checkpoint);
      }).then((registeredCheckin: Checkin) => {
        checkin = registeredCheckin;
        loader.dismiss();

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

        return self.presentCheckpointChecklistSelector(checkin, checkpoint);
      }).then((selectedValues) => {
        //LogService.log('Checkbox selected data:' + JSON.stringify(selectedValues));
        if (_.isEmpty(selectedValues))
        {
          resolve(checkin);
          return;
        }

        LogService.log('Re-saving checkin with checkbox selected data:' + JSON.stringify(selectedValues));
        checkin.setChecklistItemsFromArray(selectedValues);
        return self.checkinProvider.store(checkin, true);
      }).then(() => {
        resolve(checkin);
        //DONE
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
   * @param {Checkin} checkin
   */
  protected modifyCheckin(checkin: Checkin)
  {
    this.checkpointProvider.getCheckpoint({selector: {id: checkin.mkt_checkpoint_id_c}})
      .then((relativeCheckpoint: Checkpoint) => {
        if (relativeCheckpoint.isChecklistAvailable())
        {
          LogService.log('Modify Checkin:' + checkin.code + " - " + checkin.mkt_checkpoint_id_c);
          //LogService.log('Checkpoint: ' + relativeCheckpoint.id);

          this.presentCheckpointChecklistSelector(checkin, relativeCheckpoint).then((selectedValues) => {
            checkin.setChecklistItemsFromArray(selectedValues);
            checkin.sync_state = CrmDataModel.SYNC_STATE__CHANGED;
            this.checkinProvider.store(checkin, true).then(() => {
              LogService.log('Modified, stored and queued for save');
            }, (e) => {
              LogService.log(e, LogService.LEVEL_ERROR);
            });
          }, (e) => {
            LogService.log(e, LogService.LEVEL_ERROR);
          });
        } else
        {
          LogService.log("The checkpoint relative to this checkin does not have checklist options: " + relativeCheckpoint.code, LogService.LEVEL_WARN);
        }
      }, (e) => {
        LogService.log(e, LogService.LEVEL_ERROR);
      });
  }

  /**
   *
   * @param {Checkpoint} checkpoint
   * @returns {Promise<any>}
   */
  protected presentCheckpointChecklistSelector___PAGE(checkpoint: Checkpoint): Promise<any>
  {
    let self = this;

    return new Promise(function (resolve, reject) {

      if (!checkpoint.hasChecklistValues())
      {
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
   * @param {Checkin} checkin
   * @param {Checkpoint} checkpoint
   * @returns {Promise<any>}
   */
  protected presentCheckpointChecklistSelector(checkin: Checkin, checkpoint: Checkpoint): Promise<any>
  {
    let self = this;
    let alert;

    return new Promise(function (resolve) {

      if (!checkpoint.hasChecklistValues())
      {
        resolve();
        return;
      }

      alert = self.alertCtrl.create({
        title: 'RIFORNIMENTO',
        subTitle: 'clicca sulle voci che hai rifornito',
        enableBackdropDismiss: false
      });

      let checked: boolean;
      _.each(checkpoint.checklist_items, (label, key) => {
        checked = checkin.hasChecklistValue(key);
        alert.addInput({
          type: 'checkbox',
          label: label,
          value: key,
          checked: checked,
        });
      });

      // alert.addButton({
      //   text: 'Cancel',
      //   handler: () => {
      //     LogService.log("Cancel");
      //     resolve([]);
      //   }
      // });

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
    let navs = this.appCtrl.getRootNavs();
    let rootNav = navs.pop();
    rootNav.push(TaskNewPage);
  }

  /**
   *
   */
  goToConfigurationPage(): void
  {
    this.navCtrl.push(ConfigurationPage).then(() => {
      this.navCtrl.setRoot(ConfigurationPage);
    });
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

  //----------------------------------------------------------------------------------------------------------------TASK
  /**
   *
   * @param {string} id
   */
  protected handleNewIncomingTask(id): void
  {
    let self = this;

    this.taskProvider.getDocumentById(id).then((doc) => {
      LogService.log("TASK CHANGE ON: " + JSON.stringify(doc));
      let task = this.taskProvider.getNewModelInstance(doc);
      if (task.status == Task.STATUS_NOT_STARTED)
      {

        let taskModal = this.modalCtrl.create(HomeTaskViewPage, {task: task}, {enableBackdropDismiss: false});
        taskModal.onDidDismiss(data => {
          LogService.log("modal closed with return data: " + JSON.stringify(data));

          task.status = Task.STATUS_IN_PROGRESS;
          task.sync_state = CrmDataModel.SYNC_STATE__CHANGED;
          self.taskProvider.store(task, true).then(() => {
            LogService.log("task saved");
          });
        });
        taskModal.present();
      }
    }, (e) => {
      LogService.log("Unable to find task[" + id + "]!" + e, LogService.LEVEL_ERROR);
    });
  }

  //-----------------------------------------------------------------------------------------------------------INTERVALS
  /**
   * @param {HomePage} self
   */
  recalculateShiftTotalDuration(self: HomePage): void
  {
    let durationStr = '';
    if (_.size(this.checkins) > 0)
    {
      let shiftStartCheckin: Checkin = _.last(this.checkins) as Checkin;
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
    if (_.size(this.checkins) > 0)
    {
      let lastCheckin: Checkin = _.first(this.checkins) as Checkin;
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
   *
   * @param {string} id
   */
  private refreshCheckin(id): void
  {
    LogService.log("Looking for checkin[" + id + "]! ");
    this.checkinProvider.getDocumentById(id).then((storedDocument) => {
      let checkin: Checkin = _.find(this.checkins, {'id': id});
      if (!checkin)
      {
        //id passed by parameter can also be temporary id (ID___n) but in this.checkins
        //we store checkins (after saving to crm) by their real CRM id - so if we must search by that id
        id = storedDocument.id;
        LogService.log("Found checkin by CRM doc id[" + id + "]! ");
        checkin = _.find(this.checkins, {'id': id});
      }

      if (checkin)
      {
        //
        delete storedDocument.check_point;
        checkin.setData(storedDocument);

        this.checkins = _.reverse(_.sortBy(this.checkins, ["checkin_date"]));
        LogService.log("Checkin[" + id + "] has been updated.");
      } else
      {
        LogService.log("Checkin not found - adding...");
      }
    }, (e) => {
      LogService.log("Error refreshing Task: " + e, LogService.LEVEL_ERROR);
    });
  }



  /**
   *
   * @returns {Promise<any>}
   */
  private refreshAllCheckins(): Promise<any>
  {
    this.is_refreshing = true;
    let self = this;
    return new Promise((resolve, reject) => {
      self.remoteDataService.updateCurrentSessionCheckins().then(() => {
        self.checkins = self.remoteDataService.getCurrentSessionCheckins();
        self.is_refreshing = false;
        resolve();
      }, (e) => {
        reject(e);
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

    /* CHECKINS */
    this.dataChangeSubscription_CHK = this.checkinProvider.databaseChangeObservable.subscribe
    ((data: any) => {
      if (data.db == 'checkin' && !_.isUndefined(data.id) && !_.isEmpty(data.id))
      {
        this.refreshCheckin(data.id);
      }
    });

    /* TASKS */
    this.dataChangeSubscription_TASK = this.taskProvider.databaseChangeObservable.subscribe
    ((data: any) => {
      if (data.db == 'task' && !_.isUndefined(data.id) && !_.isEmpty(data.id))
      {
        this.handleNewIncomingTask(data.id);
      }
    });


    //start
    this.refreshAllCheckins().then(() => {
      self.autoUpdateIntevalExecution(self);
    });

  }


  /**
   *
   */
  ngOnDestroy(): void
  {
    this.networkStateSubscription.unsubscribe();
    this.dataChangeSubscription_CHK.unsubscribe();
    this.dataChangeSubscription_TASK.unsubscribe();

    if (this.auto_update_timeout)
    {
      clearTimeout(this.auto_update_timeout);
    }
  }
}
