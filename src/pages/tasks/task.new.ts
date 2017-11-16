import {Component} from '@angular/core';
import {NavController, ToastController} from 'ionic-angular';
import {Task} from "../../models/Task";
import {CrmDataModel} from "../../models/crm.data.model";
import {TaskProvider} from "../../providers/task.provider";
import {LogService} from "../../services/log.service";
import {UserService} from "../../services/user.service";

@Component({
  selector: 'page-task-new',
  templateUrl: 'task.new.html'
})
export class TaskNewPage
{

  protected task: Task;


  constructor(public navCtrl: NavController
              , private taskProvider:TaskProvider
              , private toastCtrl:ToastController
              , private userService: UserService
  )
  {
    let user_id = this.userService.getUserData("id");
    let user_name = this.userService.getUserData("full_name");

    this.task = this.taskProvider.getNewModelInstance(
      {
        name: "",
        description: "",
        sync_state: CrmDataModel.SYNC_STATE__NEW,
        created_by: user_id,
        created_by_name: user_name,
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

          let toast = this.toastCtrl.create({
            message: "La tua segnalazione è stata inoltrata",
            duration: 3000,
            position: 'top'
          });
          toast.present();

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
