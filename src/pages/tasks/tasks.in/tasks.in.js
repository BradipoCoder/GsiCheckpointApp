var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Component } from '@angular/core';
import { IonicPage, App } from 'ionic-angular';
import { TaskProvider } from "../../../providers/task.provider";
import { LogService } from "../../../services/log.service";
import { UserService } from "../../../services/user.service";
import _ from "lodash";
var TasksInPage = /** @class */ (function () {
    function TasksInPage(userService, taskProvider, appCtrl) {
        this.userService = userService;
        this.taskProvider = taskProvider;
        this.appCtrl = appCtrl;
        var navs = this.appCtrl.getRootNavs();
        this.rootNav = navs.pop();
    }
    /**
     *
     * @param {string} id
     */
    TasksInPage.prototype.refreshTask = function (id) {
        var _this = this;
        this.taskProvider.getDocumentById(id).then(function (doc) {
            var task = _.find(_this.tasks, { 'id': id });
            if (task) {
                task.setData(doc);
                _this.tasks = _.reverse(_.sortBy(_this.tasks, ["date_start"]));
                LogService.log("Task[" + id + "] has been updated.");
            }
            else {
                _this.taskProvider.getTaskById(id).then(function (task) {
                    //@note: this does not work currently because CRM permissions do not allow record assigned to a different user to be loaded
                    //IS this an IN task?
                    var user_id = _this.userService.getUserData("id");
                    if (task.assigned_user_id == user_id) {
                        _this.tasks.push(task);
                        _this.tasks = _.reverse(_.sortBy(_this.tasks, ["date_start"]));
                        LogService.log("Task[" + id + "] has been added.");
                    }
                    else {
                        LogService.log("Task[" + id + "] has been skipped because it is not assigned to user[" + user_id + "].");
                    }
                }, function (e) {
                    LogService.log("Error finding Task[" + id + "]! " + e, LogService.LEVEL_ERROR);
                });
            }
        }, function (e) {
            LogService.log("Error refreshing Task: " + e, LogService.LEVEL_ERROR);
        });
    };
    TasksInPage.prototype.refreshAllTasks = function () {
        var _this = this;
        var user_id = this.userService.getUserData("id");
        var findOptions = {
            selector: { assigned_user_id: user_id, date_start: { "$gt": null } },
            sort: [{ 'date_start': 'desc' }],
        };
        this.taskProvider.find(findOptions).then(function (tasks) {
            _this.tasks = tasks;
        }, function (e) {
            LogService.log("Error refreshing Tasks: " + e, LogService.LEVEL_ERROR);
        });
    };
    //------------------------------------------------------------------------------------------------------INIT & DESTROY
    /**
     * INIT COMPONENT
     */
    TasksInPage.prototype.ngOnInit = function () {
        var _this = this;
        this.refreshAllTasks();
        this.dataChangeSubscription = this.taskProvider.databaseChangeObservable.subscribe(function (data) {
            if (data.db == 'task' && !_.isUndefined(data.id) && !_.isEmpty(data.id)) {
                _this.refreshTask(data.id);
            }
        });
    };
    /**
     * DESTROY COMPONENT
     */
    TasksInPage.prototype.ngOnDestroy = function () {
        this.dataChangeSubscription.unsubscribe();
    };
    TasksInPage = __decorate([
        IonicPage(),
        Component({
            selector: 'page-tasks-in',
            template: "\n    <ion-content>\n      <!--<button ion-button icon-left (click)=\"openNewTaskPage()\" color=\"yellow-light\">-->\n      <!--<ion-icon name=\"star\"></ion-icon>-->\n      <!--<ion-label>Crea segnalazione</ion-label>-->\n      <!--</button>-->\n\n      <ion-grid>\n        <ion-row *ngFor=\"let task of tasks\" text-left class=\"taskrow\">\n\n          <div class=\"line author\">\n            <div class=\"user-avatar-wrapper small\" text-left>\n              <img src=\"http://gsi.crm.mekit.it/index.php?entryPoint=download&id={{task.created_by}}_photo&type=Users\">\n            </div>\n            <div class=\"name\">\n              {{task.created_by_name}}\n            </div>\n          </div>\n\n          <div class=\"line title\">\n            {{task.name}}\n          </div>\n\n          <div class=\"line description\">\n            {{task.description}}\n          </div>\n\n          <div class=\"line where-when\">\n            <div class=\"where\" *ngIf=\"task.check_point;\">\n              <ion-icon name=\"pin\" title=\"Locale\" item-left></ion-icon>\n              <div class=\"code-name\">\n                {{task.check_point.code}}&nbsp;{{task.check_point.name}}&nbsp;-&nbsp;\n              </div>\n            </div>\n            <div class=\"when\">\n              {{task.getFormattedDateStart(\"DD/MM/YYYY HH:mm\")}}\n            </div>\n            <ion-icon [name]=\"task.icon\" [color]=\"task.icon_color\" title=\"{{task.priority}}\" class=\"alert\" item-left></ion-icon>\n          </div>\n\n        </ion-row>\n      </ion-grid>\n    </ion-content>\n\n  "
        }),
        __metadata("design:paramtypes", [UserService,
            TaskProvider,
            App])
    ], TasksInPage);
    return TasksInPage;
}());
export { TasksInPage };
//# sourceMappingURL=tasks.in.js.map