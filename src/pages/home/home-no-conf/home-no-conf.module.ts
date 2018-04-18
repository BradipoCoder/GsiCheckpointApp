import {NgModule} from '@angular/core';
import {IonicPageModule} from 'ionic-angular';
import {HomeNoConfPage} from "./home-no-conf";

@NgModule({
  declarations: [
    HomeNoConfPage,
  ],
  imports: [
    IonicPageModule.forChild(HomeNoConfPage)
  ],
  exports: [
    HomeNoConfPage
  ]
})
export class HomeNoConfPageModule
{
}
