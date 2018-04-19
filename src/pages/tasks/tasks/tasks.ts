import {Component} from '@angular/core';
import {IonicPage} from 'ionic-angular';
import {TasksInPage} from "../tasks.in/tasks.in";
import {TasksOutPage} from "../tasks.out/tasks.out";

@IonicPage()
@Component({
  selector: 'page-tasks',
  template: `
    <ion-header>
      <ion-navbar>
        <button ion-button menuToggle>
          <ion-icon name="menu"></ion-icon>
        </button>
        <ion-title float-left>Segnalazioni</ion-title>
      </ion-navbar>
    </ion-header>

    <ion-tabs tabsPlacement="bottom" id="tasksTabs" >
      <ion-tab tabIcon="arrow-down" tabTitle="Ricevute" [root]="tab1"></ion-tab>
      <ion-tab tabIcon="arrow-up" tabTitle="Inviate" [root]="tab2"></ion-tab>
    </ion-tabs>
  `
})
export class TasksPage {
  tab1: any;
  tab2: any;

  constructor() {
    this.tab1 = TasksInPage;
    this.tab2 = TasksOutPage;
  }
}
