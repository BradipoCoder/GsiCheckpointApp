import {Component} from '@angular/core';
import {IonicPage} from 'ionic-angular';

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
  protected tab1: string = "TasksInPage";
  protected tab2: string = "TasksOutPage";
}
