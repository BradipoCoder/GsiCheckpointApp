import {Component} from '@angular/core';
import {NavController} from 'ionic-angular';
import {LogService} from '../../../services/log.service';
import {ConfigurationPage} from "../../configuration/configuration";

//import _ from "lodash";

@Component({
  selector: 'page-home-no-conf',
  template: `
    <ion-content text-center class="logged-out">
      <div class="header" margin-top text-center>
        <img src="assets/image/logo-traccia.png" class="logo-trace" width="228" height="128"/>
      </div>
      
      <ion-grid margin-top>        
        <ion-row>
          <ion-col>
            <ion-label color="darkest">
              Per iniziare ad usare l'applicazione completa la configurazione.
            </ion-label>
          </ion-col>
        </ion-row>

        <ion-row>
          <ion-col>
            <pre class="error">{{getErrorMessage()}}</pre>
          </ion-col>
        </ion-row>

        <ion-row>
          <ion-col>
            <button ion-button large margin-top color="yellow-light" (click)="goToConfigurationPage()">
              Configura
            </button>
          </ion-col>
        </ion-row>        
      </ion-grid>
    </ion-content>
  `
})
export class HomeNoConfPage
{
  constructor(protected navCtrl: NavController, protected logService: LogService)
  {
  }

  /**
   *
   * @returns {string}
   */
  private getErrorMessage(): string
  {
    return LogService.getLastErrorMessage();
  }

  /**
   *
   */
  goToConfigurationPage(): void
  {
    this.navCtrl.push(ConfigurationPage).then(() => {
      this.navCtrl.setRoot(ConfigurationPage);
    });
  }
}
