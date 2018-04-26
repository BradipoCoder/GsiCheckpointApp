/* CORE */
import {Component, OnDestroy, OnInit} from '@angular/core';
import {App, IonicPage, Platform, ToastController} from 'ionic-angular';
import { AppVersion } from '@ionic-native/app-version';
import {Insomnia} from '@ionic-native/insomnia';
/* PROVIDERS */
import {CheckpointProvider} from '../../../providers/checkpoint.provider';
import {CheckinProvider} from '../../../providers/checkin.provider';
/* SERVICES */
import {BackgroundService} from "../../../services/background.service";
import {RemoteDataService} from '../../../services/remote.data.service';
import {OfflineCapableRestService} from '../../../services/offline.capable.rest.service';
import {LogService} from "../../../services/log.service";
import {UserService} from "../../../services/user.service";
/* OTHER */
import _ from "lodash";
import {Subscription} from "rxjs/Subscription";
import {TaskProvider} from "../../../providers/task.provider";

@IonicPage()
@Component({
  selector: 'page-configuration-syncstate',
  template: `
    <ion-header>
      <ion-navbar>
        <button ion-button *ngIf="!isLocked()" menuToggle>
          <ion-icon name="menu"></ion-icon>
        </button>
        <ion-title float-left>Stato</ion-title>
      </ion-navbar>
    </ion-header>
    
    <ion-content *ngIf="viewIsReady">
      
      <div class="titlebar" [ngClass]="{'reset-request': backgroundService.applicationResetRequested}">
        <h1 class="tab-title">
          Stato sincronizzazione
          <br />
          {{appName}} v{{appVer}}
          <br />
          <div class="sync-state">
            <ion-icon *ngIf="is_in_sync" name="happy" class="happy"></ion-icon>
            <ion-icon *ngIf="!is_in_sync" name="sad" class="sad"></ion-icon>
          </div>          
        </h1>

        <!--ADMIN ONLY-->
        <div class="buttons cache-clean-buttons" text-center align-items-center *ngIf="userService.isTrustedUser()">

          <button ion-button icon-left (click)="backgroundService.applicationResetRequested = true; handleApplicationResetRequest();" color="danger">
            <ion-icon name="ice-cream"></ion-icon>
            <ion-label>Reset application</ion-label>
          </button>

          <button ion-button icon-left (click)="backgroundService.start()" color="light">
            <ion-icon name="clock"></ion-icon>
            <ion-label>BGS Start</ion-label>
          </button>
          <button ion-button icon-left (click)="backgroundService.stop()" color="light">
            <ion-icon name="hand"></ion-icon>
            <ion-label>BGS Stop</ion-label>
          </button>

          <button ion-button icon-left color="danger" (tap)="reboot()">
            <ion-icon name="refresh-circle"></ion-icon>
            REBOOT
          </button>
        </div>
        <!--ADMIN ONLY-->
      </div>


      <table class="table">
        <thead>
          <tr>
            <th class="left">Elemento</th>
            <th class="numeric"><ion-icon item-start name="cloud"></ion-icon></th>
            <th class="numeric"><ion-icon item-start name="phone-portrait"></ion-icon></th>
            <th class="numeric"><ion-icon item-start name="cloud-upload"></ion-icon></th>
            <th class="numeric"><ion-icon item-start name="cloud-download"></ion-icon></th>
            <th class="numeric"><ion-icon item-start name="thunderstorm"></ion-icon></th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let providerState of providerStates;">
            <td class="left">{{providerState.name}}</td>
            <td class="numeric">{{providerState.count_server}}</td>
            <td class="numeric">{{providerState.count_device}}</td>
            <td class="numeric">{{providerState.count_unsynced_up}}</td>
            <td class="numeric">{{providerState.count_unsynced_down}}</td>
            <td class="numeric">{{providerState.count_unsynced_all}}</td>
          </tr>
        </tbody>
      </table>

      <!--<ion-badge item-end>{{counts.checkins.device}}</ion-badge>-->

    </ion-content>

    <ion-content *ngIf="!viewIsReady" text-center align-items-center>
      <h1 class="loading">{{viewNotReadyText}}</h1>
    </ion-content>
  `
})
export class ConfigurationSyncstatePage implements OnInit, OnDestroy
{
  private appName:string = "";
  private appVer:string = "";

  private is_in_sync: boolean = false;
  private total_unsynced_count: number = 0;

  private viewIsReady: boolean;
  private viewNotReadyText: string = "preparazione in corso...";

  private hasInterfaceRefreshRequest = false;
  private isInterfaceRefreshRunning = false;

  private appRstChkInerval:number;

  private dataChangeSubscriptionCheckpoint: Subscription;
  private dataChangeSubscriptionCheckin: Subscription;

  protected providerStates:any = {};


  constructor(private toastCtrl: ToastController
    , private platform: Platform
    , private insomnia: Insomnia
    , private appVersion: AppVersion
    , private checkpointProvider: CheckpointProvider
    , private checkinProvider: CheckinProvider
    , private taskProvider: TaskProvider
    , private offlineCapableRestService: OfflineCapableRestService
    , protected backgroundService: BackgroundService
    , private remoteDataService: RemoteDataService
    , private userService: UserService)
  {
    this.viewIsReady = false;

    this.providerStates = [
      {
        name: 'Locali',
        count_server: 0,
        count_device: 0,
        count_unsynced_up: 0,
        count_unsynced_down: 0,
        count_unsynced_all: 0,
      },
      {
        name: 'Tracce',
        count_server: 0,
        count_device: 0,
        count_unsynced_up: 0,
        count_unsynced_down: 0,
        count_unsynced_all: 0
      },
      {
        name: 'Compiti',
        count_server: 0,
        count_device: 0,
        count_unsynced_up: 0,
        count_unsynced_down: 0,
        count_unsynced_all: 0
      }
    ];

    this.appVersion.getAppName().then((name) => {
      this.appName = name;
    }, () => {
      this.appName = "Test application";
    });

    this.appVersion.getVersionNumber().then((name) => {
      this.appVer = name;
    }, () => {
      this.appVer = "0.0.0";
    });

  }


  /* ------------------------------------------------------------------------------------------ INTERFACE ADMIN STUFF */

  protected reboot(): void
  {
    window.location.href = "/";
  }

  /**
   * @returns {boolean}
   */
  public isLocked():boolean
  {
    return this.backgroundService.isSyncPageLocked();
  }

  /**
   * Request originated from username/password configuration change
   * (self.backgroundService.applicationResetRequested = true;)
   */
  protected handleApplicationResetRequest()
  {
    this.backgroundService.lockSyncPage();
    this.viewIsReady = false;
    this.viewNotReadyText = "Riconfigurazione applicazione in corso...";
    this.unsubscribeToDataChange();
    this.killAllData().then(() => {
      LogService.log("APP RESET - DATA CLEARED");
      this.backgroundService.setSyncIntervalFast();
      this.backgroundService.start().then(() => {
        LogService.log("APP RESET - BACKGROUND SERVICE STARTED");
        this.viewIsReady = true;
        this.appRstChkInerval = setInterval(this.handleApplicationResetRequest_check, 1000, this);
      });
    });
  }

  /**
   *
   * @param {ConfigurationSyncstatePage} self
   */
  protected handleApplicationResetRequest_check(self:ConfigurationSyncstatePage)
  {
    LogService.log("APP RESET - tick");
    self.updateCounts().then(() => {
      if(self.is_in_sync)
      {
        LogService.log("APP RESET - FULLY SYNCED");
        clearInterval(self.appRstChkInerval);
        self.appRstChkInerval = null;
        self.backgroundService.setSyncIntervalNormal();
        //REBOOT ENTIRE APPLICATION
        window.location.href = "/";
      } else {
        LogService.log("APP RESET - TICK(waiting for full sync)");
      }
    });
  }


  /**
   *
   * @returns {Promise<any>}
   */
  public killAllData(): Promise<any>
  {
    let self = this;

    return new Promise((resolve, reject) => {
      let msg = "Stopping background service...";
      LogService.log(msg);
      self.backgroundService.stop().then(() => {
        msg = "* Background service stopped.";
        LogService.log(msg);
        //
        msg = "Resetting provider sync offsets...";
        LogService.log(msg);
        return self.backgroundService.resetDataProvidersSyncOffset();//--------------------->
      }).then(() => {
        msg = "* Provider sync offsets were reset.";
        LogService.log(msg);
        //
        msg = "Destroying databases...";
        LogService.log(msg);
        return self.remoteDataService.destroyLocalDataStorages();
      }).then(() => {
        msg = "Initializing remote data service...";
        LogService.log(msg);
        return self.remoteDataService.initialize();
      }).then(() => {
        LogService.log("DONE!", LogService.LEVEL_WARN);
        resolve();
      }).catch(e => {
        LogService.error(e);
        reject(e);
      });
    });
  }

  /* ------------------------------------------------------------------------------------------ INTERFACE ADMIN STUFF */

  /**
   * Do NOT use this method directly especially for repeated events (like DB CHANGE)
   * but use: registerInterfaceRefreshRequest
   *
   * @returns {Promise<any>}
   */
  protected updateCounts(): Promise<any>
  {
    let self = this;

    return new Promise(function (resolve, reject) {
      let countPromises = [
        self.checkpointProvider.getRemoteDataCount(),
        self.checkpointProvider.getDatabaseDocumentCount(),
        self.checkpointProvider.getSyncableDataCountUp(),
        self.checkpointProvider.getSyncableDataCountDown(),

        self.checkinProvider.getRemoteDataCount(),
        self.checkinProvider.getDatabaseDocumentCount(),
        self.checkinProvider.getSyncableDataCountUp(),
        self.checkinProvider.getSyncableDataCountDown(),

        self.taskProvider.getRemoteDataCount(),
        self.taskProvider.getDatabaseDocumentCount(),
        self.taskProvider.getSyncableDataCountUp(),
        self.taskProvider.getSyncableDataCountDown(),
      ];

      Promise.all(countPromises).then((data) => {
        LogService.log("SYNC COUNT DATA" + JSON.stringify(data));

        self.total_unsynced_count = 0;

        //CHECKPOINTS[0] - CHECKINS[1] - TASKS[2]
        let moduleNumber;
        let moduleDataOffset;
        for (moduleNumber = 0; moduleNumber <= 2; moduleNumber++)
        {
          moduleDataOffset = (moduleNumber * 4);
          self.providerStates[moduleNumber].count_server = data[moduleDataOffset];
          self.providerStates[moduleNumber].count_device = data[moduleDataOffset + 1];
          self.providerStates[moduleNumber].count_unsynced_up = data[moduleDataOffset + 2];
          self.providerStates[moduleNumber].count_unsynced_down = data[moduleDataOffset + 3];
          self.providerStates[moduleNumber].count_unsynced_all = data[moduleDataOffset + 2] + data[moduleDataOffset + 3];
          self.total_unsynced_count += self.providerStates[moduleNumber].count_unsynced_all;
        }

        // IS IN SYNC
        self.is_in_sync = (self.total_unsynced_count == 0);

        self.viewIsReady = true;
        resolve();
      }, (e) => {
        reject(e);
      });
    });
  }

  /**
   *
   */
  protected registerInterfaceRefreshRequest(): void
  {
    if (this.isInterfaceRefreshRunning)
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
    let recheck = function (self) {
      self.isInterfaceRefreshRunning = false;

      if (self.hasInterfaceRefreshRequest)
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
  protected dbChangeSubscriberNextData(data: any): void
  {
    if (_.includes(['checkpoint', 'checkin'], data.db))
    {
      //LogService.log('CFG[SS]['+data.db+'] ID: ' + data.id);
      this.registerInterfaceRefreshRequest();
    }
  }

  private subscribeToDataChange(): void
  {
    this.dataChangeSubscriptionCheckin = this.checkinProvider.databaseChangeObservable.subscribe(data => this.dbChangeSubscriberNextData(data));
    this.dataChangeSubscriptionCheckpoint = this.checkpointProvider.databaseChangeObservable.subscribe(data => this.dbChangeSubscriberNextData(data));
  }

  private unsubscribeToDataChange(): void
  {
    if (this.dataChangeSubscriptionCheckin)
    {
      this.dataChangeSubscriptionCheckin.unsubscribe();
    }
    if (this.dataChangeSubscriptionCheckpoint)
    {
      this.dataChangeSubscriptionCheckpoint.unsubscribe();
    }
  }

  /**
   * Actions on component init
   */
  public ngOnInit(): void
  {
    if (this.platform.is("mobile"))
    {
      this.insomnia.keepAwake();
    }

    if (this.backgroundService.applicationResetRequested)
    {
      this.handleApplicationResetRequest();
      return;
    }

    this.registerInterfaceRefreshRequest();
    this.subscribeToDataChange();
  }

  /**
   * Actions on component destroy
   */
  public ngOnDestroy(): void
  {
    if (this.platform.is("mobile"))
    {
      this.insomnia.allowSleepAgain();
    }
    this.unsubscribeToDataChange();
  }
}
