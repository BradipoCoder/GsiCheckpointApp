import {NgModule} from '@angular/core';
import {IonicPageModule} from 'ionic-angular';
import {HomeOutPage} from "./home-out";

@NgModule({
  declarations: [
    HomeOutPage,
  ],
  imports: [
    IonicPageModule.forChild(HomeOutPage)
  ],
  exports: [
    HomeOutPage
  ]
})
export class HomeOutPageModule
{
}
