import {NgModule} from '@angular/core';
import {IonicPageModule} from 'ionic-angular';
import {ConfigurationSyncstatePage} from "./configuration.syncstate";

@NgModule({
  declarations: [
    ConfigurationSyncstatePage,
  ],
  imports: [
    IonicPageModule.forChild(ConfigurationSyncstatePage)
  ],
  exports: [
    ConfigurationSyncstatePage
  ]
})
export class ConfigurationSyncstatePageModule
{
}
