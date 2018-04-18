import {NgModule} from '@angular/core';
import {IonicPageModule} from 'ionic-angular';
import {ConfigurationUnlockerPage} from "../configuration.unlocker/configuration.unlocker";

@NgModule({
  declarations: [
    ConfigurationUnlockerPage,
  ],
  imports: [
    IonicPageModule.forChild(ConfigurationUnlockerPage)
  ],
  exports: [
    ConfigurationUnlockerPage
  ]
})
export class ConfigurationUnlockerPageModule
{
}
