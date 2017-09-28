import {Injectable} from '@angular/core';
import {UserService} from '../services/user.service';
import {RemoteDataService} from '../services/remote.data.service';
import {Promise} from '../../node_modules/bluebird'

@Injectable()
export class BackgroundService
{

  private execution_count = 0;
  private execution_count_max = 0;

  private execution_interval_ms = (1 * 1000);

  private auto_update_timeout: number;

  constructor(
    private remoteDataService: RemoteDataService,
    private userService: UserService)
  {
  }


  /**
   * Auto-self-calling function at regular intervals
   * @param {BackgroundService} self
   * @param {boolean} [skip_actions]
   */
  private intervalExecution(self: BackgroundService, skip_actions: boolean = false): void
  {
    let reprogram = function (self) {
      if (!self.execution_count_max || self.execution_count < self.execution_count_max)
      {
        self.auto_update_timeout = setTimeout(self.intervalExecution, (self.execution_interval_ms), self);
      } else
      {
        console.warn("BackgroundService max execution limit " + self.execution_count_max + " reached. Interval execution stopped.");
      }
    };

    if (!skip_actions)
    {
      if (self.execution_count > 1000000)
      {
        self.execution_count = 0;
      }
      self.execution_count++;
      console.log("BSE[" + self.execution_count + "/" + self.execution_count_max + "].");
      self.executionRun(self)
        .then(() => {
          //console.log("Syncing Data providers: DONE!");
        }, (e) => {
          //console.warn("Syncing Data providers: ERROR! - " + e);
        }).then(() => {
        console.log("BSE RUN[" + self.execution_count + "]: DONE.");
        reprogram(self);
      });

    } else
    {
      reprogram(self);
    }
  }


  /**
   *
   * @param {BackgroundService} self
   * @returns {Promise<any>}
   */
  private executionRun(self: BackgroundService): Promise<any>
  {
    return new Promise(function (resolve, reject)
    {
      self.userService.autologin().then(() => {
          //done
        }, (e) => {
          return reject(e);
        }
      ).then(() => {
          return self.remoteDataService.syncDataProviders();
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


  /**
   * @returns {Promise<any>}
   */
  public initialize(): Promise<any>
  {
    let self = this;

    return new Promise(function (resolve, reject)
    {
      self.intervalExecution(self, true);
      resolve();
    });
  }
}
