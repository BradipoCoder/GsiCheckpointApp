import {NgModule} from '@angular/core';
import {IonicPageModule} from 'ionic-angular';
import {ConfigurationSettingsPage} from "./configuration.settings";

@NgModule({
  declarations: [
    ConfigurationSettingsPage,
  ],
  imports: [
    IonicPageModule.forChild(ConfigurationSettingsPage)
  ],
  exports: [
    ConfigurationSettingsPage
  ]
})
export class ConfigurationSettingsPageModule
{
}
