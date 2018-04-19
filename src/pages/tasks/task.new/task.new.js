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
import { IonicPage, NavController, ToastController } from 'ionic-angular';
import { TaskProvider } from "../../../providers/task.provider";
import { LogService } from "../../../services/log.service";
import { UserService } from "../../../services/user.service";
import { Checkpoint } from "../../../models/Checkpoint";
import { CrmDataModel } from "../../../models/crm.data.model";
import { CheckinProvider } from "../../../providers/checkin.provider";
import * as moment from 'moment';
/**
 * @todo: 1) implementare foto?
 *
 */
var TaskNewPage = /** @class */ (function () {
    function TaskNewPage(navCtrl, taskProvider, checkinProvider, toastCtrl, userService) {
        this.navCtrl = navCtrl;
        this.taskProvider = taskProvider;
        this.checkinProvider = checkinProvider;
        this.toastCtrl = toastCtrl;
        this.userService = userService;
    }
    TaskNewPage.prototype.initializewithTaskData = function () {
        var _this = this;
        var user_id = this.userService.getUserData("id");
        var user_name = this.userService.getUserData("full_name");
        this.task = this.taskProvider.getNewModelInstance({
            name: "",
            description: "",
            sync_state: CrmDataModel.SYNC_STATE__NEW,
            created_by: user_id,
            created_by_name: user_name,
            assigned_user_id: "50566622-c661-7b6f-645c-59477ccfe9cb" /* carla miani */
        });
        var checkin_CHK;
        var checkin_OUT;
        this.checkinProvider.getlastCheckinOperationByType(Checkpoint.TYPE_CHK).then(function (checkin) {
            checkin_CHK = checkin;
            LogService.log("CHK: " + JSON.stringify(checkin_CHK));
            _this.checkinProvider.getlastCheckinOperationByType(Checkpoint.TYPE_OUT).then(function (checkin) {
                checkin_OUT = checkin;
                LogService.log("OUT: " + JSON.stringify(checkin_OUT));
                var diff = moment(checkin_OUT.checkin_date).diff(checkin_CHK.checkin_date, "seconds");
                LogService.log("OUT - CHK - DIFF: " + diff);
                if (diff < 0) {
                    _this.task.setData({
                        parent_type: "mkt_Checkpoint",
                        parent_id: checkin_CHK.mkt_checkpoint_id_c,
                    });
                    _this.taskProvider.setRelatedCheckpointOnTask(_this.task);
                }
                else {
                    LogService.log("No CHK checkin since last logout. Task will not be related to any checkpoint.", LogService.LEVEL_WARN);
                }
            }, function (e) {
                LogService.log("Error getting last OUT checkin: " + e, LogService.LEVEL_WARN);
            });
        }, function (e) {
            LogService.log("Error getting last CHK checkin: " + e, LogService.LEVEL_WARN);
        });
    };
    /**
     *
     * @returns {Promise<any>}
     */
    TaskNewPage.prototype.actionSave = function () {
        var _this = this;
        var self = this;
        return new Promise(function (resolve) {
            self.taskProvider.store(_this.task).then(function (id) {
                LogService.log("Task stored with id: " + id);
                _this.navCtrl.pop().then(function () {
                    var toast = _this.toastCtrl.create({
                        message: "La tua segnalazione è stata inoltrata",
                        duration: 3000,
                        position: 'top'
                    });
                    toast.present();
                    resolve();
                });
            }, function (e) {
                LogService.log("Error storing new Task: " + e, LogService.LEVEL_ERROR);
            });
        });
    };
    /**
     *
     * @returns {Promise<any>}
     */
    TaskNewPage.prototype.actionCancel = function () {
        return this.navCtrl.pop();
    };
    //------------------------------------------------------------------------------------------------------INIT & DESTROY
    /**
     * INIT COMPONENT
     */
    TaskNewPage.prototype.ngOnInit = function () {
        this.initializewithTaskData();
    };
    TaskNewPage = __decorate([
        IonicPage(),
        Component({
            selector: 'page-task-new',
            template: "\n    <ion-header>\n      <ion-navbar>\n        <ion-title>Nuova Segnalazione</ion-title>\n      </ion-navbar>\n    </ion-header>\n\n    <ion-content>\n\n      <ion-list>\n        <!--<ion-list-header>Generale</ion-list-header>-->\n        <ion-item>\n          <ion-input placeholder=\"Oggetto segnalazione\" clearInput [(ngModel)]=\"task.name\"></ion-input>\n        </ion-item>\n        <ion-item>\n          <ion-textarea placeholder=\"Descrizione estesa\" [(ngModel)]=\"task.description\"></ion-textarea>\n        </ion-item>\n\n        <ion-item>\n          <div class=\"where\" *ngIf=\"task.check_point;\">\n            <ion-icon name=\"pin\" title=\"Locale\" item-left></ion-icon>\n            <div class=\"code-name\">\n              [{{task.check_point.code}}]&nbsp;{{task.check_point.name}}\n            </div>\n          </div>\n\n        </ion-item>\n      </ion-list>\n\n\n\n    </ion-content>\n\n    <ion-footer>\n      <div class=\"buttons\">\n        <button ion-button icon-left float-left (click)=\"actionCancel()\" color=\"yellow-light\">\n          <ion-icon name=\"arrow-back\"></ion-icon>\n          <ion-label>Indietro</ion-label>\n        </button>\n\n        <button ion-button icon-left float-right (click)=\"actionSave()\" color=\"green-light\">\n          <ion-icon name=\"send\"></ion-icon>\n          <ion-label>Invia</ion-label>\n        </button>\n      </div>\n\n      <div text-center class=\"explanation\">\n        Compila i campi e premi il tasto invia per registrare una segnalazione.\n      </div>\n\n    </ion-footer>\n  "
        }),
        __metadata("design:paramtypes", [NavController,
            TaskProvider,
            CheckinProvider,
            ToastController,
            UserService])
    ], TaskNewPage);
    return TaskNewPage;
}());
export { TaskNewPage };
//# sourceMappingURL=task.new.js.map