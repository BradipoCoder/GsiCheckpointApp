import {Component, OnDestroy, OnInit} from '@angular/core';
import {CheckinProvider} from '../../providers/checkin.provider';
import {Checkin} from "../../models/Checkin";
import * as moment from 'moment';
import {Subscription} from "rxjs/Subscription";

@Component({
  selector: 'page-checkins',
  templateUrl: 'checkins.html'
})
export class CheckinsPage implements OnInit, OnDestroy
{

  /**
   * @type {Checkpoint[]}
   */
  private checkins: any = [];

  private is_refreshing = false;
  private lastRefresh;

  private dataChangeSubscription: Subscription;

  constructor(private checkinProvider: CheckinProvider)
  {
  }

  /**
   * @todo: we should implement an id based refresh where we substitute documents singularly
   */
  private refreshCheckins(): void
  {
    if (this.is_refreshing)
    {
      //console.warn("Refresh is already on the way...(skipping);)");
      return;
    }

    let fiveSecondsAgo = moment().subtract(5, 'seconds');
    if (this.lastRefresh && this.lastRefresh.isAfter(fiveSecondsAgo))
    {
      //console.warn("Skipping refresh - too early ;)");
      return;
    }

    this.is_refreshing = true;


    let findOptions =
      {
        selector: {checkin_date: {"$gt": null}},
        sort: [{'checkin_date': 'desc'}],
        /*limit: 25*/
      };
    this.checkinProvider.find(findOptions).then(
      (checkins: Checkin[]) => {
        this.checkins = checkins;
        this.lastRefresh = moment();
        this.is_refreshing = false;
      });

  }

  //------------------------------------------------------------------------------------------------------INIT & DESTROY
  /**
   * INIT COMPONENT
   */
  ngOnInit(): void
  {
    this.refreshCheckins();


    this.dataChangeSubscription = this.checkinProvider.databaseChangeObservable.subscribe(
      (data: any) => {
        if (data.db == 'checkin')
        {
          //console.log('CHECKPOINT DB CHANGE Observed: ', data);
          this.refreshCheckins();
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
