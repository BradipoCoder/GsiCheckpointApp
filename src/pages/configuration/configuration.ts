/* CORE */
import {Component} from '@angular/core';
import {NavController} from 'ionic-angular';
/* SERVICES */
import {BackgroundService} from "../../services/background.service";
/* PAGES */
import {ConfigurationSyncstatePage} from './configuration.syncstate';
import {ConfigurationSettingsPage} from './configuration.settings';
/* OTHER */

@Component({
  selector: 'page-configuration',
  templateUrl: 'configuration.html'
})
export class ConfigurationPage
{
  tab1: any;
  tab2: any;

  constructor(private backgroundService: BackgroundService)
  {
    this.tab1 = ConfigurationSyncstatePage;
    this.tab2 = ConfigurationSettingsPage;
  }

  /**
   * @returns {boolean}
   */
  public isLocked():boolean
  {
   return this.backgroundService.isSyncPageLocked();
  }
}
