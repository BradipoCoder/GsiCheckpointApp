import {Component, OnInit} from '@angular/core';
import {IonicPage, NavController, ToastController} from 'ionic-angular';
import {TaskProvider} from "../../../providers/task.provider";
import {LogService} from "../../../services/log.service";
import {UserService} from "../../../services/user.service";
import {Checkin} from "../../../models/Checkin";
import {Checkpoint} from "../../../models/Checkpoint";
import {Task} from "../../../models/Task";
import {CrmDataModel} from "../../../models/crm.data.model";
import {CheckinProvider} from "../../../providers/checkin.provider";
import * as moment from 'moment';


/**
 * @todo: 1) implementare foto?
 *
 */
@IonicPage()
@Component({
  selector: 'page-task-new',
  template: `
    <ion-header>
      <ion-navbar>
        <ion-title>Nuova Segnalazione</ion-title>
      </ion-navbar>
    </ion-header>

    <ion-content>

      <ion-list>
        <!--<ion-list-header>Generale</ion-list-header>-->
        <ion-item>
          <ion-input placeholder="Oggetto segnalazione" clearInput [(ngModel)]="task.name"></ion-input>
        </ion-item>
        <ion-item>
          <ion-textarea placeholder="Descrizione estesa" [(ngModel)]="task.description"></ion-textarea>
        </ion-item>

        <ion-item>
          <div class="where" *ngIf="task.check_point;">
            <ion-icon name="pin" title="Locale" item-left></ion-icon>
            <div class="code-name">
              [{{task.check_point.code}}]&nbsp;{{task.check_point.name}}
            </div>
          </div>

        </ion-item>
      </ion-list>



    </ion-content>

    <ion-footer>
      <div class="buttons">
        <button ion-button icon-left float-left (click)="actionCancel()" color="yellow-light">
          <ion-icon name="arrow-back"></ion-icon>
          <ion-label>Indietro</ion-label>
        </button>

        <button ion-button icon-left float-right (click)="actionSave()" color="green-light">
          <ion-icon name="send"></ion-icon>
          <ion-label>Invia</ion-label>
        </button>
      </div>

      <div text-center class="explanation">
        Compila i campi e premi il tasto invia per registrare una segnalazione.
      </div>

    </ion-footer>
  `
})
export class TaskNewPage implements OnInit
{

  protected task: Task;


  constructor(public navCtrl: NavController
              , private taskProvider:TaskProvider
              , private checkinProvider:CheckinProvider
              , private toastCtrl:ToastController
              , private userService: UserService
  )
  {
  }


  protected initializewithTaskData():void
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

    let checkin_CHK:Checkin;
    let checkin_OUT:Checkin;
    this.checkinProvider.getlastCheckinOperationByType(Checkpoint.TYPE_CHK).then((checkin:Checkin) => {
      checkin_CHK = checkin;
      LogService.log("CHK: " + JSON.stringify(checkin_CHK));
      this.checkinProvider.getlastCheckinOperationByType(Checkpoint.TYPE_OUT).then((checkin:Checkin) => {
        checkin_OUT = checkin;
        LogService.log("OUT: " + JSON.stringify(checkin_OUT));
        let diff = moment(checkin_OUT.checkin_date).diff(checkin_CHK.checkin_date, "seconds");
        LogService.log("OUT - CHK - DIFF: " + diff);
        if(diff < 0)
        {
          this.task.setData({
            parent_type: "mkt_Checkpoint",
            parent_id: checkin_CHK.mkt_checkpoint_id_c,
          });
          this.taskProvider.setRelatedCheckpointOnTask(this.task);
        } else {
          LogService.log("No CHK checkin since last logout. Task will not be related to any checkpoint.", LogService.LEVEL_WARN);
        }
      }, (e) => {
        LogService.log("Error getting last OUT checkin: " + e, LogService.LEVEL_WARN);
      });
    }, (e) => {
      LogService.log("Error getting last CHK checkin: " + e, LogService.LEVEL_WARN);
    });
  }


  /**
   *
   * @returns {Promise<any>}
   */
  public actionSave(): Promise<any>
  {
    let self = this;

    return new Promise((resolve) => {
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

  //------------------------------------------------------------------------------------------------------INIT & DESTROY
  /**
   * INIT COMPONENT
   */
  ngOnInit(): void
  {
    this.initializewithTaskData();
  }
}
