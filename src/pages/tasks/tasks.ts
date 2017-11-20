import { Component } from '@angular/core';
import { TasksInPage} from "./tasks.in";
import { TasksOutPage} from "./tasks.out";

@Component({
  selector: 'page-tasks',
  templateUrl: 'tasks.html'
})
export class TasksPage {
  tab1: any;
  tab2: any;



  constructor() {
    this.tab1 = TasksInPage;
    this.tab2 = TasksOutPage;

  }

}
