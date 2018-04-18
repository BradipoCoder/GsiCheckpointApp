import {NgModule} from '@angular/core';
import {IonicPageModule} from 'ionic-angular';
import {HomeCodeRegPage} from "./home-code-reg";

@NgModule({
  declarations: [
    HomeCodeRegPage,
  ],
  imports: [
    IonicPageModule.forChild(HomeCodeRegPage)
  ],
  exports: [
    HomeCodeRegPage
  ]
})
export class HomeCodeRegPageModule
{
}
