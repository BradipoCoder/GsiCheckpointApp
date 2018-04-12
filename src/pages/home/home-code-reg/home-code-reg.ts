/* Import: Core */
import {Component} from '@angular/core';
import {NavController} from 'ionic-angular';
/* Import: services */
import {CodeScanService} from '../../../services/code.scan.service';
import {LogService} from '../../../services/log.service';


//import _ from "lodash";

@Component({
  selector: 'page-home-code-reg',
  template: `
    <ion-content text-center>
      
      <ion-grid margin-top>        
        <ion-row>
          <ion-col>
            <ion-label color="darkest">
              <h3>Registrazione codice</h3>
              <h1>{{codeScanService.getScannedCodeToRegister()}}</h1>
            </ion-label>
          </ion-col>
        </ion-row>

        <ion-row>
          <ion-col>
            <pre class="error">{{getErrorMessage()}}</pre>
          </ion-col>
        </ion-row>
        
      </ion-grid>
    </ion-content>
  `
})
export class HomeCodeRegPage
{
  constructor(protected navCtrl: NavController
              , protected codeScanService: CodeScanService
              , protected logService: LogService)
  {
    //
  }

  /**
   *
   * @returns {string}
   */
  private getErrorMessage(): string
  {
    let errorMessage = LogService.getLastErrorMessage();
    if(errorMessage === "OK")
    {
      errorMessage = "";
    }
    return errorMessage;
  }

}
