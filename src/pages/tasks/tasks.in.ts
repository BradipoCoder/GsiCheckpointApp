import {Component, OnInit, OnDestroy} from '@angular/core';
import {App, NavController} from 'ionic-angular';
import {TaskNewPage} from "./task.new";
import {TaskProvider} from "../../providers/task.provider";
import {Task} from "../../models/Task";
import * as moment from 'moment';
import {Subscription} from "rxjs/Subscription";
import {LogService} from "../../services/log.service";
import _ from "lodash";

@Component({
  selector: 'page-tasks-in',
  templateUrl: 'tasks.in.html'
})
export class TasksInPage implements OnInit, OnDestroy
{
  private tasks: Task[];

  private rootNav: any;

  private dataChangeSubscription: Subscription;

  /**
   *
   */
  constructor(
    private taskProvider:TaskProvider
    , public appCtrl: App
    , public navCtrl: NavController
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
   * @param string id
   */
  private refreshTask(id): void
  {
    LogService.log("TASK Data Change: " + id);

    this.taskProvider.getDocumentById(id).then((doc) => {
      //LogService.log("DOC: " + JSON.stringify(doc));

      let el:Task = _.find(this.tasks, { 'id': id});
      el.setData(doc);


    }, (e) => {
      LogService.log("Error refreshing Task: " + e, LogService.LEVEL_ERROR);
    });
  }


  private refreshAllTasks(): void
  {
    let findOptions =
      {
        selector: {date_start: {"$gt": null}},
        sort: [{'date_start': 'desc'}],
        /*limit: 25*/
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
