import {Component} from '@angular/core';
import {NavParams, ViewController} from 'ionic-angular';
import {LogService} from "../../services/log.service";
import {Task} from "../../models/Task";

@Component({
  selector: 'page-home-task-view',
  templateUrl: 'home.task.view.html'
})
export class HomeTaskViewPage
{
  protected task:Task = this.navParams.get("task");

  constructor(private navParams:NavParams, private viewCtrl: ViewController)
  {}

  /**
   *
   */
  protected confirmTask():void
  {
    LogService.log("HTV - confirm task.");
    let data = {};
    this.viewCtrl.dismiss(data);
  }
}
