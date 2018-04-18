import {NgModule} from '@angular/core';
import {IonicPageModule} from 'ionic-angular';
import {HomePausePage} from "./home-pause";

@NgModule({
  declarations: [
    HomePausePage,
  ],
  imports: [
    IonicPageModule.forChild(HomePausePage)
  ],
  exports: [
    HomePausePage
  ]
})
export class HomePausePageModule
{
}
