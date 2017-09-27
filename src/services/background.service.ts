import {Injectable} from '@angular/core';

import { RemoteDataService } from '../services/remote.data.service';
import { CheckpointProvider } from '../providers/checkpoint.provider';
import {CrmDataModel} from "../models/crm.data.model";
import {Checkpoint} from "../models/Checkpoint";

import _ from "lodash";
import * as moment from 'moment';


@Injectable()
export class BackgroundService
{

  private execution_count = 0;
  private execution_count_max = 2;

  private execution_interval_ms = (3 * 1000);

  private auto_update_timeout: number;

  constructor(private remoteDataService: RemoteDataService)
  {
  }



  /**
   * Auto-self-calling function at regular intervals
   * @param {BackgroundService} self
   * @param {boolean} [skip_actions]
   */
  private intervalExecution(self: BackgroundService, skip_actions:boolean = false): void
  {
    if(!skip_actions)
    {
      try
      {
        if(self.execution_count > 1000000)
        {
          self.execution_count = 0;
        }
        self.execution_count++;
        console.log("BSE["+self.execution_count+"/"+self.execution_count_max+"].");

        self.remoteDataService.syncDataProviders().then(() => {
          console.log("Syncing Data providers: DONE!");
        }, (err) => {
          console.error("syncDataProviders Error!", err)
        });

      } catch(e)
      {
        console.error("BackgroundService execution error. ", e);
      }
    }

    if(!self.execution_count_max || self.execution_count < self.execution_count_max)
    {
      self.auto_update_timeout = setTimeout(self.intervalExecution, (self.execution_interval_ms), self);
    } else {
      console.warn("BackgroundService max execution limit " + self.execution_count_max + " reached. Interval execution stopped.");
    }
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
