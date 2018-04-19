/* CORE */
import {Component} from '@angular/core';
import {IonicPage} from 'ionic-angular';
/* SERVICES */
import {BackgroundService} from "../../../services/background.service";

/* OTHER */

@IonicPage()
@Component({
  selector: 'page-configuration',
  template: `
    <ion-header>
      <ion-navbar>
        <button ion-button *ngIf="!isLocked()" menuToggle>
          <ion-icon name="menu"></ion-icon>
        </button>
        <ion-title float-left>Configurazione</ion-title>
      </ion-navbar>
    </ion-header>

    <ion-tabs>
      <ion-tab tabIcon="sync" tabTitle="Sincronizzazione" [root]="tab1"></ion-tab>
      <ion-tab tabIcon="switch" tabTitle="Impostazioni" [root]="tab2" enabled="{{!isLocked()}}"></ion-tab>
    </ion-tabs>
  `
})
export class ConfigurationPage
{
  protected tab1: string;
  protected tab2: string;

  constructor(private backgroundService: BackgroundService)
  {
    this.tab1 = "ConfigurationSyncstatePage";
    this.tab2 = "ConfigurationSettingsPage";
  }

  /**
   * @returns {boolean}
   */
  public isLocked():boolean
  {
   return this.backgroundService.isSyncPageLocked();
  }
}
