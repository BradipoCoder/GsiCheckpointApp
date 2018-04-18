import {NgModule} from '@angular/core';
import {IonicPageModule} from 'ionic-angular';
import {HomeCodeChecklistPage} from "./home-code-checklist";

@NgModule({
  declarations: [
    HomeCodeChecklistPage,
  ],
  imports: [
    IonicPageModule.forChild(HomeCodeChecklistPage)
  ],
  exports: [
    HomeCodeChecklistPage
  ]
})
export class HomeCodeChecklistPageModule
{
}
