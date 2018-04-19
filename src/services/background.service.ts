import {Injectable} from '@angular/core';
/* Services */
import {UserService} from './user.service';
import {LogService} from "./log.service";
/* Data Providers */
import {CheckpointProvider} from "../providers/checkpoint.provider";
import {CheckinProvider} from "../providers/checkin.provider";
import {TaskProvider} from "../providers/task.provider";
/* Other */
import {Promise} from '../../node_modules/bluebird'
import _ from "lodash";
import {LocalDocumentProvider} from "../providers/local.document.provider";


@Injectable()
export class BackgroundService
{
  private is_running = false;
  private stop_requested = false;

  private execution_count = 0;
  private execution_count_max = 0;

  private startup_delay_ms = (15 * 1000);

  private execution_interval_slow_ms = (15 * 1000);
  private execution_interval_fast_ms = (0.5 * 1000);
  private execution_interval_ms = this.execution_interval_slow_ms;

  private auto_update_timeout: number;

  protected dataProviders: any = [];

  /* using variable to lock user on sync page until initial sync has completed */
  private syncPageLocked = false;

  public applicationResetRequested:boolean = false;

  constructor(private checkpointProvider: CheckpointProvider
    , private checkinProvider: CheckinProvider
    , private taskProvider: TaskProvider
    , private userService: UserService)
  {
    this.dataProviders = [
      this.checkpointProvider,
      this.checkinProvider,
      this.taskProvider
    ];
  }

  //------------------------------------------------------------------------------------------------------------INTERNAL
  /**
   * Auto-self-calling function at regular intervals
   * @param {BackgroundService} self
   */
  private intervalExecution(self: BackgroundService): void
  {
    /**
     * @param self
     */
    let reprogram = function (self: BackgroundService) {
      if (self.stop_requested)
      {
        self.execution_count = 0;
        return;
      }

      if (self.execution_count_max && self.execution_count >= self.execution_count_max)
      {
        self.execution_count = 0;
        LogService.log("BackgroundService max execution limit " + self.execution_count_max + " reached. Interval execution stopped.", LogService.LEVEL_WARN);
        return;
      }

      self.auto_update_timeout = setTimeout(self.intervalExecution, self.execution_interval_ms, self);
    };

    if (self.stop_requested)
    {
      self.is_running = false;
      self.execution_count = 0;
      return;
    }

    self.is_running = true;

    if (self.execution_count > 1000000)
    {
      self.execution_count = 0;
    }
    self.execution_count++;

    LogService.log("BSE[" + self.execution_count + "/" + self.execution_count_max + "].");

    self.executionRun(self).then(() => {
        self.is_running = false;
        LogService.log("BSE RUN[" + self.execution_count + "]: DONE.");
        reprogram(self);
      }, (e) => {
        self.is_running = false;
        LogService.log("BSE RUN[" + self.execution_count + "]: ERROR. " + e);
        reprogram(self);
      });
  }


  /**
   *
   * @param {BackgroundService} self
   * @returns {Promise<any>}
   */
  private executionRun(self: BackgroundService): Promise<any>
  {
    return new Promise(function (resolve, reject) {
      self.userService.autologin().then(() => {
        return self.syncDataProviders();
        }, (e) => {
          return reject(e);
        }
      ).then(() => {
          resolve();
        }, (e) => {
          return reject(e);
        }
      );
    });
  }


  //-----------------------------------------------------------------------------------------------------PUBLIC CONTROLS
  public stop(): Promise<any>
  {
    let self = this;
    let waitInterval = null;
    let waitCount = 0;
    let intervalTimeout = 1000;
    let waitMaxCount = 3 * (this.execution_interval_slow_ms / intervalTimeout);
    self.stop_requested = true;


    return new Promise(function (resolve, reject) {
      clearTimeout(self.auto_update_timeout);
      waitInterval = setInterval(() => {
        waitCount++;
        LogService.log("waiting to stop[" + waitCount + "/" + waitMaxCount + "]...");
        if (self.is_running == false)
        {
          clearInterval(waitInterval);
          waitInterval = null;
          self.stop_requested = false;
          LogService.log("Background service is now stopped.");
          resolve();
        }
        if (waitCount > waitMaxCount)
        {
          clearInterval(waitInterval);
          waitInterval = null;
          self.stop_requested = false;
          reject(new Error("Background service would not stop!"));
        }
      }, intervalTimeout);
    });
  }

  public start(): Promise<any>
  {
    let self = this;

    return new Promise(function (resolve, reject) {
      if (!self.is_running)
      {
        self.intervalExecution(self);
        resolve();
      } else
      {
        reject(new Error("Already running!"));
      }
    });
  }


  /**
   * @returns {boolean}
   */
  public isSyncPageLocked(): boolean
  {
    return this.syncPageLocked;
  }

  public lockSyncPage(): void
  {
    this.syncPageLocked = true;
  }

  public unlockSyncPage(): void
  {
    this.syncPageLocked = false;
  }


  /**
   * Set interval to do fast execution riprogramming
   */
  public setSyncIntervalFast(): void
  {
    this.execution_interval_ms = this.execution_interval_fast_ms;
  }

  /**
   * Set interval to do fast execution riprogramming
   */
  public setSyncIntervalNormal(): void
  {
    this.execution_interval_ms = this.execution_interval_slow_ms;
  }

  //-------------------------------------------------------------------------------------------------SYNC DATA PROVIDERS
  /**
   *
   * Call providers in order as specified in the this.dataProviders array
   *
   * @returns {Promise<any>}
   */
  public syncDataProviders(): Promise<any>
  {
    return new Promise((resolve, reject) => {

      let countPromises = [];
      _.forEach(this.dataProviders, (provider: LocalDocumentProvider) => {
        countPromises.push(provider.getSyncableDataCountUpAndDown());
      });

      Promise.all(countPromises).then((countData: Array<number>) => {
        //LogService.log("---COUNT DATA" + JSON.stringify(countData));

        let providerToSync: any = false;

        _.forEach(countData, (count: number, index: number) => {
          if (count > 0)
          {
            providerToSync = <LocalDocumentProvider>this.dataProviders[index];
            LogService.log(index + "> " + providerToSync.constructor.name + ": " + count);
            return false; //exit loop
          } else {
            return true;
          }
        });

        if (providerToSync === false)
        {
          LogService.log("All providers are in sync.");

          return resolve();
        }

        if (providerToSync instanceof LocalDocumentProvider)
        {
          LogService.log("syncDataProviders calling provider to sync: " + providerToSync.constructor.name);
          providerToSync.syncWithRemote().then(() => {
            resolve();
          }, e => {
            reject(e);
          });
        }
      });
    });
  }

  /**
   *
   * @returns {Promise<any>}
   */
  public resetDataProvidersSyncOffset(): Promise<any>
  {
    return Promise.reduce(this.dataProviders, function (accu, provider, index) {
      LogService.log("[RST]PROVIDER#" + index + " - " + provider.constructor.name);
      return provider.resetSyncOffsetToZero();
    }, null);
  }


  //----------------------------------------------------------------------------------------------------------------INIT
  /**
   * @returns {Promise<any>}
   */
  public initialize(): Promise<any>
  {
    //@fixme: re-enable
    //setTimeout(this.intervalExecution, this.startup_delay_ms, this);

    return new Promise(resolve => {
      resolve();
    });
  }
}
