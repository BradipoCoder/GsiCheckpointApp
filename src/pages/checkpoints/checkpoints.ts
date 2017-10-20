import {Component, OnInit, OnDestroy} from '@angular/core';
import {CheckpointProvider} from '../../providers/checkpoint.provider';
import {BackgroundService} from "../../services/background.service";
import {Checkpoint} from "../../models/Checkpoint";
import * as moment from 'moment';
import {Subscription} from "rxjs/Subscription";
import {LogService} from "../../services/log.service";

@Component({
  selector: 'page-checkpoints',
  templateUrl: 'checkpoints.html'
})
export class CheckpointsPage implements OnInit, OnDestroy
{

  /**
   * @type {Checkpoint[]}
   */
  private checkpoints: any = [];

  private is_refreshing = false;
  private lastRefresh;

  private dataChangeSubscription: Subscription;

  constructor(private checkpointProvider: CheckpointProvider, private backgroundService: BackgroundService)
  {
  }

  /**
   * @todo: we should implement an id based refresh where we substitute documents singularly
   */
  private refreshCheckpoints(): void
  {
    if(this.is_refreshing) {
      //LogService.warn("Refresh is already on the way...(skipping);)");
      return;
    }

    let fiveSecondsAgo = moment().subtract(5, 'seconds');
    if (this.lastRefresh && this.lastRefresh.isAfter(fiveSecondsAgo))
    {
      //LogService.warn("Skipping refresh - too early ;)");
      return;
    }

    this.is_refreshing = true;

    let findOptions =
      {
        selector: {code: {"$gt": null}},
        sort: [{'code': 'asc'}],
        /*limit: 25*/
      };
    this.checkpointProvider.find(findOptions).then(
      (checkpoints: Checkpoint[]) => {
        this.checkpoints = checkpoints;
        this.lastRefresh = moment();
        this.is_refreshing = false;
      });
  }

  public action1(): void
  {
    LogService.log("A1 - START");
    this.backgroundService.start().then(() => {
      LogService.log("A1 - START DONE.");
      }, (e) => {
      LogService.log("A1 - START ERROR - " + e, LogService.LEVEL_ERROR);
      }
    );
  }

  public action2(): void
  {
    LogService.log("A2 - STOP");
    this.backgroundService.stop().then(() => {
        LogService.log("A2 - STOP DONE.");
      }, (e) => {
        LogService.log("A2 - STOP ERROR - " + e, LogService.LEVEL_ERROR);
      }
    );
  }

  //------------------------------------------------------------------------------------------------------INIT & DESTROY
  /**
   * INIT COMPONENT
   */
  ngOnInit(): void
  {
    this.refreshCheckpoints();

    this.dataChangeSubscription = this.checkpointProvider.databaseChangeObservable.subscribe(
      (data: any) => {
        if(data.db == 'checkpoint') {
          this.refreshCheckpoints();
        }
      });
  }


  /**
   * DESTROY COMPONENT
   */
  ngOnDestroy(): void
  {
    this.dataChangeSubscription.unsubscribe();
  }
}
