import {Component, OnInit, OnDestroy} from '@angular/core';
import {CheckpointProvider} from '../../providers/checkpoint.provider';
import {BackgroundService} from "../../services/background.service";
import {Checkpoint} from "../../models/Checkpoint";
import * as moment from 'moment';
import {Subscription} from "rxjs/Subscription";

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
   * @todo: last triggered update could be skipped never updating to final list :....?
   */
  private refreshCheckpoints(): void
  {
    if(this.is_refreshing) {
      console.warn("Refresh is already on the way...(skipping);)");
      return;
    }

    let fiveSecondsAgo = moment().subtract(5, 'seconds');
    if (this.lastRefresh && this.lastRefresh.isAfter(fiveSecondsAgo))
    {
      console.warn("Skipping refresh - too early ;)");
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
    console.log("A1 - START");
    this.backgroundService.start().then(() => {
        console.log("A1 - START DONE.");
      }, (e) => {
        console.error("A1 - START ERROR - " + e);
      }
    );
  }

  public action2(): void
  {
    console.log("A2 - STOP");
    this.backgroundService.stop().then(() => {
        console.log("A2 - STOP DONE.");
      }, (e) => {
        console.error("A2 - STOP ERROR - " + e);
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
          //console.log('CHECKPOINT DB CHANGE Observed: ', data);
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
