import {Component} from '@angular/core';
import {NavController} from 'ionic-angular';
import {Task} from "../../models/Task";
import {CrmDataModel} from "../../models/crm.data.model";
import {TaskProvider} from "../../providers/task.provider";
import {LogService} from "../../services/log.service";

@Component({
  selector: 'page-task-new',
  templateUrl: 'task.new.html'
})
export class TaskNewPage
{

  protected task: Task;


  constructor(public navCtrl: NavController, private taskProvider:TaskProvider)
  {
    this.task = new Task(
      {
        name: "",
        description: "",
        sync_state: CrmDataModel.SYNC_STATE__NEW,
        assigned_user_id: "50566622-c661-7b6f-645c-59477ccfe9cb"/* carla miani */
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
      self.taskProvider.store(this.task).then((id) => {
        LogService.log("Task stored with id: " + id);
        this.navCtrl.pop().then(() => {
          resolve();
        });
      }, (e) => {
        LogService.log("Error storing new Task: " + e, LogService.LEVEL_ERROR);

      });
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
