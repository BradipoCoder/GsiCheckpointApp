import {NgModule} from '@angular/core';
import {IonicPageModule} from 'ionic-angular';
import {TasksInPage} from "./tasks.in";

@NgModule({
  declarations: [
    TasksInPage,
  ],
  imports: [
    IonicPageModule.forChild(TasksInPage)
  ],
  exports: [
    TasksInPage
  ]
})
export class TasksInPageModule
{
}

