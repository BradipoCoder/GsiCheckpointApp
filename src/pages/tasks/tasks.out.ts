import {Component, OnInit, OnDestroy} from '@angular/core';
import {App} from 'ionic-angular';
import {TaskNewPage} from "./task.new";
import {TaskProvider} from "../../providers/task.provider";
import {Task} from "../../models/Task";
import {Subscription} from "rxjs/Subscription";
import {LogService} from "../../services/log.service";
import _ from "lodash";
import {UserService} from "../../services/user.service";

@Component({
  selector: 'page-tasks-out',
  templateUrl: 'tasks.out.html'
})
export class TasksOutPage  implements OnInit, OnDestroy
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
   * @returns {Promise<any>}
   */
  public openNewTaskPage(): Promise<any>
  {
    return this.rootNav.push(TaskNewPage);
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
          //IS this an OUT task?
          let user_id = this.userService.getUserData("id");
          if(task.created_by == user_id)
          {
            this.tasks.push(task);
            this.tasks = _.reverse(_.sortBy(this.tasks, ["date_start"]));
            LogService.log("Task[" + id + "] has been added.");
          } else {
            LogService.log("Task["+id+"] has been skipped because it is not created by user["+user_id+"].");
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
        selector: {created_by: user_id, date_start: {"$gt": null}},
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
