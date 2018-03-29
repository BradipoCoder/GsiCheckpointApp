import {Component, OnDestroy, OnInit} from '@angular/core';
import {RemoteDataService} from '../../services/remote.data.service';

import {Checkpoint} from '../../models/Checkpoint';

import _ from "lodash";
import {LogService} from "../../services/log.service";


@Component({
  selector: 'page-home-checkin-view',
  templateUrl: 'home.checkin.view.html'
})
export class HomeCheckinViewPage implements OnInit, OnDestroy
{
  private checkpoint:Checkpoint;

  private checklist:any;

  constructor(private remoteDataService:RemoteDataService)
  {}


  protected confirmChecklist():void
  {
    LogService.log("HCV - confirm checklist: " + JSON.stringify(this.checklist));

    let selectedData = ['aaa','bbb'];
    let selectorPromiseResolve = this.remoteDataService.HomeCheckinViewPageData.promise_resolve;
    selectorPromiseResolve.call(this, selectedData);
  }



  ngOnInit(): void
  {
    LogService.log("HCV - init");
    this.checkpoint = this.remoteDataService.HomeCheckinViewPageData.checkpoint;

    this.checklist = [];
    let el;
    _.each(this.checkpoint.checklist_items, (v,k) => {
      el = {
        key: k,
        value: v,
        checked: false
      };
      this.checklist.push(el);
    });
  }


  ngOnDestroy(): void
  {
    this.remoteDataService.HomeCheckinViewPageData = null;
  }
}
