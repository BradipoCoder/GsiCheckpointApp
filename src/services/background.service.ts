import {Injectable} from '@angular/core';



@Injectable()
export class BackgroundService
{

  private execution_interval_ms = (5 * 1000);

  private auto_update_timeout: number;

  constructor()
  {
  }


  /**
   * Auto-self-calling function at regular intervals
   * @param {BackgroundService} self
   * @param {boolean} [skip_actions]
   */
  private intevalExecution(self: BackgroundService, skip_actions:boolean = false): void
  {
    if(!skip_actions)
    {
      try
      {
        console.log("ping...");
        //self.recalculateShiftTotalDuration(self);
        //self.recalculateLastCheckinDuration(self);
      } catch(e)
      {
        console.error("BackgroundService execution error. ", e);
      }
    }

    //self.auto_update_timeout = setTimeout(self.intevalExecution, (self.execution_interval_ms), self);
  }


  /**
   * @returns {Promise<any>}
   */
  public initialize(): Promise<any>
  {
    let self = this;

    return new Promise(function (resolve, reject)
    {

      self.intevalExecution(self, false);

      resolve();
    });
  }
}
