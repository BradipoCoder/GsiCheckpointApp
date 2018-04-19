import {NgModule} from '@angular/core';
import {IonicPageModule} from 'ionic-angular';
import {TasksOutPage} from "./tasks.out";

@NgModule({
  declarations: [
    TasksOutPage,
  ],
  imports: [
    IonicPageModule.forChild(TasksOutPage)
  ],
  exports: [
    TasksOutPage
  ]
})
export class TasksOutPageModule
{
}

