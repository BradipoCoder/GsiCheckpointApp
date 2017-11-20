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


@Injectable()
export class BackgroundService
{
  private is_running = false;
  private stop_requested = false;

  private execution_count = 0;
  private execution_count_max = 0;

  private startup_delay_ms = (5 * 1000);//@todo: put me back to 30


  private execution_interval_slow_ms = (5 * 1000);//@todo: put me back to 30
  private execution_interval_fast_ms = (0.5 * 1000);
  private execution_interval_ms = this.execution_interval_slow_ms;

  private auto_update_timeout: number;

  protected dataProviders: any = [];

  /* using variable to lock user on sync page until initial sync has completed */
  private syncPageLocked = false;

  constructor(private checkpointProvider: CheckpointProvider
              , private checkinProvider: CheckinProvider
              , private taskProvider: TaskProvider
              ,private userService: UserService)
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
    let reprogram = function (self) {
      if(self.stop_requested)
      {
        self.is_running = false;
        self.execution_count = 0;
        return;
      }

      if (self.execution_count_max && self.execution_count >= self.execution_count_max)
      {
        self.is_running = false;
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
    self.executionRun(self)
      .then(() => {
        //LogService.log("executionRun: DONE!");
      }, () => {
        //LogService.warn("executionRun: ERROR! - " + e);
      }).then(() => {
      LogService.log("BSE RUN[" + self.execution_count + "]: DONE.");
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
          //done
        }, (e) => {
          return reject(e);
        }
      ).then(() => {
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
      waitInterval = setInterval(() => {
        waitCount++;
        LogService.log("waiting to stop[" + waitCount + "/" + waitMaxCount + "]...");
        if (self.is_running == false)
        {
          clearInterval(waitInterval);
          waitInterval = null;
          self.stop_requested = false;
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
  public isSyncPageLocked():boolean
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
  public setSyncIntervalFast():void
  {
    this.execution_interval_ms = this.execution_interval_fast_ms;
  }

  /**
   * Set interval to do fast execution riprogramming
   */
  public setSyncIntervalSlow():void
  {
    this.execution_interval_ms = this.execution_interval_slow_ms;
  }

  //-------------------------------------------------------------------------------------------------SYNC DATA PROVIDERS
  /**
   *
   * @returns {Promise<any>}
   */
  public syncDataProviders(): Promise<any>
  {
    return Promise.reduce(this.dataProviders, function(accu, provider, index)
    {
      LogService.log("[SYNC]PROVIDER#" + index + " - " + provider.constructor.name);
      return provider.syncWithRemote();
    }, null);
  }

  /**
   *
   * @returns {Promise<any>}
   */
  public resetDataProvidersSyncOffset(): Promise<any>
  {
    return Promise.reduce(this.dataProviders, function(accu, provider, index)
    {
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
    setTimeout(this.intervalExecution, this.startup_delay_ms, this);

    return new Promise(function (resolve) {
      resolve();
    });
  }
}
