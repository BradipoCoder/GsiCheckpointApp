import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import { TasksInPage} from "./tasks.in";
import { TasksOutPage} from "./tasks.out";

@Component({
  selector: 'page-tasks',
  templateUrl: 'tasks.html'
})
export class TasksPage {
  tab1: any;
  tab2: any;



  constructor(public navCtrl: NavController) {
    this.tab1 = TasksInPage;
    this.tab2 = TasksOutPage;

  }

}
