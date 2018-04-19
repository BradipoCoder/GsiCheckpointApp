import {Component, OnDestroy, OnInit} from '@angular/core';
import {IonicPage, App} from 'ionic-angular';
import {TaskProvider} from "../../../providers/task.provider";
import {Task} from "../../../models/Task";
import {LogService} from "../../../services/log.service";
import {UserService} from "../../../services/user.service";
import _ from "lodash";
import {Subscription} from "rxjs/Subscription";

@IonicPage()
@Component({
  selector: 'page-tasks-in',
  template: `
    <ion-content>
      <!--<button ion-button icon-left (click)="openNewTaskPage()" color="yellow-light">-->
      <!--<ion-icon name="star"></ion-icon>-->
      <!--<ion-label>Crea segnalazione</ion-label>-->
      <!--</button>-->

      <ion-grid>
        <ion-row *ngFor="let task of tasks" text-left class="taskrow">

          <div class="line author">
            <div class="user-avatar-wrapper small" text-left>
              <img src="http://gsi.crm.mekit.it/index.php?entryPoint=download&id={{task.created_by}}_photo&type=Users">
            </div>
            <div class="name">
              {{task.created_by_name}}
            </div>
          </div>

          <div class="line title">
            {{task.name}}
          </div>

          <div class="line description">
            {{task.description}}
          </div>

          <div class="line where-when">
            <div class="where" *ngIf="task.check_point;">
              <ion-icon name="pin" title="Locale" item-left></ion-icon>
              <div class="code-name">
                {{task.check_point.code}}&nbsp;{{task.check_point.name}}&nbsp;-&nbsp;
              </div>
            </div>
            <div class="when">
              {{task.getFormattedDateStart("DD/MM/YYYY HH:mm")}}
            </div>
            <ion-icon [name]="task.icon" [color]="task.icon_color" title="{{task.priority}}" class="alert" item-left></ion-icon>
          </div>

        </ion-row>
      </ion-grid>
    </ion-content>

  `
})
export class TasksInPage implements OnInit, OnDestroy
{
  private tasks: Task[];

  private rootNav: any;

  private dataChangeSubscription: Subscription;

  constructor(
    private userService:UserService
    , private taskProvider:TaskProvider
    , public appCtrl: App
  )
  {
    let navs = this.appCtrl.getRootNavs();
    this.rootNav = navs.pop();
  }

  /**
   *
   * @param {string} id
   */
  private refreshTask(id): void
  {
    this.taskProvider.getDocumentById(id).then((doc) => {
      let task:Task = _.find(this.tasks, { 'id': id});
      if(task)
      {
        task.setData(doc);
        this.tasks = _.reverse(_.sortBy(this.tasks, ["date_start"]));
        LogService.log("Task["+id+"] has been updated.");
      } else
      {
        this.taskProvider.getTaskById(id).then((task:Task) => {
          //@note: this does not work currently because CRM permissions do not allow record assigned to a different user to be loaded
          //IS this an IN task?
          let user_id = this.userService.getUserData("id");
          if(task.assigned_user_id == user_id) {
            this.tasks.push(task);
            this.tasks = _.reverse(_.sortBy(this.tasks, ["date_start"]));
            LogService.log("Task["+id+"] has been added.");
          } else {
            LogService.log("Task["+id+"] has been skipped because it is not assigned to user["+user_id+"].");
          }
        }, (e) => {
          LogService.log("Error finding Task["+id+"]! " + e, LogService.LEVEL_ERROR);
        });
      }
    }, (e) => {
      LogService.log("Error refreshing Task: " + e, LogService.LEVEL_ERROR);
    });
  }


  private refreshAllTasks(): void
  {
    let user_id = this.userService.getUserData("id");
    let findOptions =
      {
        selector: {assigned_user_id: user_id, date_start: {"$gt": null}},
        sort: [{'date_start': 'desc'}],
      };

    this.taskProvider.find(findOptions).then(
      (tasks: Task[]) => {
        this.tasks = tasks;
      }, (e) => {
        LogService.log("Error refreshing Tasks: " + e, LogService.LEVEL_ERROR);
      });
  }

  //------------------------------------------------------------------------------------------------------INIT & DESTROY
  /**
   * INIT COMPONENT
   */
  ngOnInit(): void
  {
    this.refreshAllTasks();

    this.dataChangeSubscription = this.taskProvider.databaseChangeObservable.subscribe(
      (data: any) => {
        if(data.db == 'task' && !_.isUndefined(data.id) && !_.isEmpty(data.id)) {
          this.refreshTask(data.id);
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
