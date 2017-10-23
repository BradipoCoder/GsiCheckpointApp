/* CORE */
import {Component, OnInit, OnDestroy} from '@angular/core';
import {ViewController} from 'ionic-angular';
import { Insomnia } from '@ionic-native/insomnia';
/* PROVIDERS */
import {CheckpointProvider} from '../../providers/checkpoint.provider';
import {CheckinProvider} from '../../providers/checkin.provider';
/* SERVICES */
import {BackgroundService} from "../../services/background.service";
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

  private hasInterfaceRefreshRequest = false;
  private isInterfaceRefreshRunning = false;

  private dataChangeSubscriptionCheckpoint: Subscription;
  private dataChangeSubscriptionCheckin: Subscription;


  constructor(protected viewCtrl: ViewController
    , private insomnia: Insomnia
    , private checkpointProvider:CheckpointProvider
    , private checkinProvider:CheckinProvider
    , private backgroundService: BackgroundService)
  {
    this.counts = {
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

        self.completeFullCacheCleanAction();

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
      let unlockCount = this.counts.checkpoints.unsynced_up
        + this.counts.checkpoints.unsynced_down
        + this.counts.checkins.unsynced_up
        + this.counts.checkins.unsynced_down;

      if(unlockCount == 0)
      {
        LogService.log("FULL CACHE CLEAN COMPLETED.", LogService.LEVEL_WARN);
        this.backgroundService.setSyncIntervalSlow();
        this.backgroundService.unlockSyncPage();
        this.insomnia.allowSleepAgain().then(() => {
          LogService.log("KEEP AWAKE OFF!");
        });
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
   */
  public ngOnInit(): void
  {
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
