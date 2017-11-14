import {Component} from '@angular/core';
import {NavController} from 'ionic-angular';
import {Task} from "../../models/Task";
import {LogService} from "../../services/log.service";

@Component({
  selector: 'page-task-new',
  templateUrl: 'task.new.html'
})
export class TaskNewPage
{

  protected task: Task;


  constructor(public navCtrl: NavController)
  {

    this.task = new Task(
      {
        name: "",
        description: "",
      }
      );
  }

  /**
   *
   * @returns {Promise<any>}
   */
  public actionSave(): Promise<any>
  {
    let self = this;

    return new Promise((resolve, reject) => {
      LogService.log("SAVE!");
      resolve();
    });
  }

  /**
   *
   * @returns {Promise<any>}
   */
  public actionCancel(): Promise<any>
  {
    return this.navCtrl.pop();
  }

}
