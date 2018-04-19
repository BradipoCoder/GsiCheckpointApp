import {NgModule} from '@angular/core';
import {IonicPageModule} from 'ionic-angular';
import {HomeCheckinlistPage} from "./home-checkinlist";

@NgModule({
  declarations: [
    HomeCheckinlistPage,
  ],
  imports: [
    IonicPageModule.forChild(HomeCheckinlistPage)
  ],
  exports: [
    HomeCheckinlistPage
  ]
})
export class HomeCheckinlistPageModule
{
}

