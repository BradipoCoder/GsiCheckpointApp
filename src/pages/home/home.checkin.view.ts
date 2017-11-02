import {Component, OnInit, OnDestroy} from '@angular/core';
import {Platform, NavController, ToastController, LoadingController, AlertController} from 'ionic-angular';

import {UserService} from '../../services/user.service';
import {RemoteDataService} from '../../services/remote.data.service';
import {OfflineCapableRestService} from '../../services/offline.capable.rest.service';

import {CheckpointProvider} from "../../providers/checkpoint.provider";
import {CheckinProvider} from "../../providers/checkin.provider";

import {Checkpoint} from '../../models/Checkpoint';
import {Checkin} from "../../models/Checkin";

import _ from "lodash";
import * as moment from 'moment';
import {Subscription} from "rxjs/Subscription";
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
  {

  }

  checklistChange():void
  {
    LogService.log("HCV - change: " + JSON.stringify(this.checklist));
  }

  protected confirmChecklist():void
  {

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
    LogService.log("HCV - destroy");
  }
}
