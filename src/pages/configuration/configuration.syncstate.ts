/* CORE */
import {Component, OnInit, OnDestroy} from '@angular/core';
import {ViewController, ToastController, Platform} from 'ionic-angular';
import { Insomnia } from '@ionic-native/insomnia';
/* PROVIDERS */
import {CheckpointProvider} from '../../providers/checkpoint.provider';
import {CheckinProvider} from '../../providers/checkin.provider';
/* SERVICES */
import {BackgroundService} from "../../services/background.service";
import {OfflineCapableRestService} from '../../services/offline.capable.rest.service';
import {LogService} from "../../services/log.service";
/* OTHER */
import _ from "lodash";
import {Promise} from '../../../node_modules/bluebird'
import {Subscription} from "rxjs/Subscription";

@Component({
  selector: 'page-configuration-syncstate',
  templateUrl: 'configuration.syncstate.html'
})
export class ConfigurationSyncstatePage implements OnInit, OnDestroy
{

  private counts: any;

  private is_in_sync: boolean = false;

  private viewIsReady: boolean;

  private hasInterfaceRefreshRequest = false;
  private isInterfaceRefreshRunning = false;

  private dataChangeSubscriptionCheckpoint: Subscription;
  private dataChangeSubscriptionCheckin: Subscription;


  constructor(protected viewCtrl: ViewController
    , private toastCtrl: ToastController
    , private platform:Platform
    , private insomnia: Insomnia
    , private checkpointProvider:CheckpointProvider
    , private checkinProvider:CheckinProvider
    , private offlineCapableRestService: OfflineCapableRestService
    , private backgroundService: BackgroundService)
  {
    this.viewIsReady = false;

    this.counts = {
      unsynced_count: 0, /* total unsynced count */
      checkpoints: {
        server: 0,
        device: 0,
        unsynced_up: 0,
        unsynced_down: 0,
      },
      checkins: {
        server: 0,
        device: 0,
        unsynced_up: 0,
        unsynced_down: 0,
      }
    };
  }

  public quickSync():void
  {
    let self = this;

    return new Promise(function (resolve) {
      if (!self.offlineCapableRestService.isNetworkConnected())
      {
        let toast = self.toastCtrl.create({
          message: "Nessuna connessione! Connettiti alla rete e riprova.",
          duration: 5000,
          position: 'top'
        });
        toast.present().then(() => {
          resolve();
        });
        return;
      }

      if (self.platform.is("mobile"))
      {
        self.insomnia.keepAwake().then(() => {
          LogService.log("KEEP AWAKE ON!");
        });
      }

      self.backgroundService.lockSyncPage();
      self.backgroundService.setSyncIntervalFast();
      self.updateCounts().then(() => {
        resolve();
      });
    });
  }

  /**
   * Do NOT use this method directly especially for repeated events (like DB CHANGE)
   * but use: registerInterfaceRefreshRequest
   *
   * @returns {Promise<any>}
   */
  protected updateCounts():Promise<any>
  {
    let self = this;

    return new Promise(function (resolve, reject)
    {
      let countPromises = [
        self.checkpointProvider.getRemoteDataCount(),
        self.checkpointProvider.getDatabaseDocumentCount(),
        self.checkpointProvider.getSyncableDataCountUp(),
        self.checkpointProvider.getSyncableDataCountDown(),

        self.checkinProvider.getRemoteDataCount(),
        self.checkinProvider.getDatabaseDocumentCount(),
        self.checkinProvider.getSyncableDataCountUp(),
        self.checkinProvider.getSyncableDataCountDown(),
      ];

      Promise.all(countPromises).then((data) => {
        LogService.log("SYNC COUNT DATA" + JSON.stringify(data));

        //CHECKPOINTS
        self.counts.checkpoints.server = data[0];
        self.counts.checkpoints.device = data[1];
        self.counts.checkpoints.unsynced_up = data[2];
        self.counts.checkpoints.unsynced_down = data[3];

        //CHECKINS
        self.counts.checkins.server = data[4];
        self.counts.checkins.device = data[5];
        self.counts.checkins.unsynced_up = data[6];
        self.counts.checkins.unsynced_down = data[7];

        //TOTAL UNSYNCED COUNT
        self.counts.unsynced_count = self.counts.checkpoints.unsynced_up
          + self.counts.checkpoints.unsynced_down
          + self.counts.checkins.unsynced_up
          + self.counts.checkins.unsynced_down;

        // IS IN SYNC
        self.is_in_sync = (self.counts.unsynced_count == 0);

        self.completeFullCacheCleanAction();

        self.viewIsReady = true;
        resolve();
      }, (e) => {
        reject(e);
      });
    });
  }

  /**
   * Unlock Sync page and do other after full cache clear actions
   */
  protected completeFullCacheCleanAction():void
  {
    if (this.backgroundService.isSyncPageLocked())
    {
      if(this.counts.unsynced_count == 0)
      {
        LogService.log("FULL CACHE CLEAN COMPLETED.", LogService.LEVEL_WARN);
        this.backgroundService.setSyncIntervalSlow();
        this.backgroundService.unlockSyncPage();

        if (this.platform.is("mobile"))
        {
          this.insomnia.allowSleepAgain().then(() => {
            LogService.log("KEEP AWAKE OFF!");
          });
        }
      }
    }
  }

  /**
   *
   */
  protected registerInterfaceRefreshRequest():void
  {
    if(this.isInterfaceRefreshRunning)
    {
      //LogService.log('CFG[SS] - IRR already running - skipping.');
      this.hasInterfaceRefreshRequest = true;
      return;
    }

    /**
     * Recheck if we need to run the action again
     *
     * @param {ConfigurationSyncstatePage} self
     */
    let recheck = function(self)
    {
      self.isInterfaceRefreshRunning = false;

      if(self.hasInterfaceRefreshRequest)
      {
        self.hasInterfaceRefreshRequest = false;
        self.registerInterfaceRefreshRequest();
      }
    };

    this.isInterfaceRefreshRunning = true;
    this.updateCounts().then(() => {
      recheck(this);
    }, () => {
      recheck(this);
    });
  }

  /**
   *
   * @param {any} data
   */
  protected dbChangeSubscriberNextData(data:any): void
  {
    if (_.includes(['checkpoint', 'checkin'], data.db))
    {
      //LogService.log('CFG[SS]['+data.db+'] ID: ' + data.id);
      this.registerInterfaceRefreshRequest();
    }
  }


  /**
   * Actions on component init
   * @todo: we also need calls on regular intervals
   */
  public ngOnInit(): void
  {
    //@todo: TEMPORARY - REMOVE ME WITH NEXT RELEASE(1.1.11)
    if (this.platform.is("mobile"))
    {
      this.insomnia.keepAwake().then(() => {
        LogService.log("KEEP AWAKE ON!");
      });
    }


    this.dataChangeSubscriptionCheckin = this.checkinProvider.databaseChangeObservable.subscribe(data => this.dbChangeSubscriberNextData(data));
    this.dataChangeSubscriptionCheckpoint = this.checkpointProvider.databaseChangeObservable.subscribe(data => this.dbChangeSubscriberNextData(data));
    this.registerInterfaceRefreshRequest();
  }

  /**
   * Actions on component destroy
   */
  public ngOnDestroy(): void
  {
    this.dataChangeSubscriptionCheckin.unsubscribe();
    this.dataChangeSubscriptionCheckpoint.unsubscribe();
  }
}
