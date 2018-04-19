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
import { IonicPage } from 'ionic-angular';
import { TasksInPage } from "../tasks.in/tasks.in";
import { TasksOutPage } from "../tasks.out/tasks.out";
var TasksPage = /** @class */ (function () {
    function TasksPage() {
        this.tab1 = TasksInPage;
        this.tab2 = TasksOutPage;
    }
    TasksPage = __decorate([
        IonicPage(),
        Component({
            selector: 'page-tasks',
            template: "\n    <ion-header>\n      <ion-navbar>\n        <button ion-button menuToggle>\n          <ion-icon name=\"menu\"></ion-icon>\n        </button>\n        <ion-title float-left>Segnalazioni</ion-title>\n      </ion-navbar>\n    </ion-header>\n\n    <ion-tabs tabsPlacement=\"bottom\" id=\"tasksTabs\" >\n      <ion-tab tabIcon=\"arrow-down\" tabTitle=\"Ricevute\" [root]=\"tab1\"></ion-tab>\n      <ion-tab tabIcon=\"arrow-up\" tabTitle=\"Inviate\" [root]=\"tab2\"></ion-tab>\n    </ion-tabs>\n  "
        }),
        __metadata("design:paramtypes", [])
    ], TasksPage);
    return TasksPage;
}());
export { TasksPage };
//# sourceMappingURL=tasks.js.map