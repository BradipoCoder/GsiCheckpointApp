/* Import: Core */
import {Component, OnInit} from '@angular/core';
import {NavController} from 'ionic-angular';
/* Import: services */
import {CodeScanService} from '../../../services/code.scan.service';
import {RemoteDataService} from "../../../services/remote.data.service";
import {LogService} from '../../../services/log.service';
/* Import: providers */
import {CheckpointProvider} from "../../../providers/checkpoint.provider";
/* Import: models */
import {Checkpoint} from "../../../models/Checkpoint";
/* Import: pages */
import {HomePage} from "../home";
import {Checkin} from "../../../models/Checkin";

/* Import: utilities */
//import _ from "lodash";

@Component({
  selector: 'page-home-code-reg',
  template: `
    <ion-content text-center>

      <div class="spinner">
        <img width="71" height="61" src="assets/image/spinner.gif" />
      </div>
      
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
            <pre>{{getMessages()}}</pre>
          </ion-col>
        </ion-row>
          
        <ion-row *ngIf="getErrorMessage()">
          <ion-col>
            <pre class="error">ERRORE: {{getErrorMessage()}}</pre>
            <button ion-button margin-top color="danger" (click)="registerErrorAndReset()">
              Segnala errore e chiudi
            </button>
          </ion-col>
        </ion-row>

      </ion-grid>
    </ion-content>
  `
})
export class HomeCodeRegPage implements OnInit
{

  private messages:any = [];

  constructor(protected navCtrl: NavController
              , protected codeScanService: CodeScanService
              , protected remoteDataService: RemoteDataService
              , protected logService: LogService
              , protected checkpointProvider: CheckpointProvider
  )
  {
    //
  }

  /**
   * @todo: remove me!
   */
  registerErrorAndReset(): void
  {
    //@todo: register error here
    this.codeScanService.setCodeScanInProgress(false);
    this.navCtrl.setRoot(HomePage).then(() => {
      LogService.log("--- RESET HOME ---");
    });
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

  /**
   *
   * @returns {string}
   */
  private getMessages(): string
  {
    let answer = this.messages.join("\n");
    return answer;
  }

  /**
   * @param {Checkpoint} checkpoint
   * @returns {Promise<Checkin>}
   */
  protected registerNewCheckinForCheckpoint(checkpoint: Checkpoint): Promise<Checkin>
  {
    let self = this;
    let loader;
    let checkin: Checkin;

    return new Promise(function (resolve, reject) {
      LogService.log("Registering checkin for CP[" + checkpoint.code + "]: " + checkpoint.name);
      self.messages.push(checkpoint.name);
      self.messages.push("registrazione in corso...");

      self.remoteDataService.storeNewCheckinForCheckpoint(checkpoint).then((registeredCheckin:Checkin) => {
        checkin = registeredCheckin;
        LogService.log("Registration OK: [" + checkin.code + "] " + checkin.name);
        self.messages.push("Registrazione ok.");
        resolve(checkin);

      }, (e) => {
        return reject(e);
      });


      /*.then((registeredCheckin: Checkin) => {
        checkin = registeredCheckin;
        loader.dismiss();

        let msg = "Sei entrato in: [" + checkin.code + "] " + checkin.name;

        if (checkin.type == Checkpoint.TYPE_OUT)
        {
          msg = "Fine turno";
          self.presentLogoutScreen = true;
        } else if (checkin.type == Checkpoint.TYPE_IN)
        {
          self.presentLogoutScreen = false;
          msg = "Inizio turno";
        }
        loader.setContent(msg);

        return self.presentCheckpointChecklistSelector(checkin, checkpoint);
      }).then((selectedValues) => {
        //LogService.log('Checkbox selected data:' + JSON.stringify(selectedValues));
        if (_.isEmpty(selectedValues))
        {
          resolve(checkin);
          return;
        }

        LogService.log('Re-saving checkin with checkbox selected data:' + JSON.stringify(selectedValues));
        checkin.setChecklistItemsFromArray(selectedValues);
        return self.checkinProvider.store(checkin, true);
      }).then(() => {
        resolve(checkin);
        //DONE
      }, (e) => {
        if (!_.isUndefined(loader))
        {
          loader.dismiss();
        }
        reject(e);
      }).catch((e) => {
        if (!_.isUndefined(loader))
        {
          loader.dismiss();
        }
        reject(e);
      });
      */
    });
  }

  ngOnInit(): void
  {
    this.messages = [];
    let barcode = this.codeScanService.getScannedCodeToRegister();
    LogService.log("STARTING CODE REGISTRATION PROCESS FOR CODE: " + barcode);
    this.messages.push("ricerca locale in corso...");
    this.checkpointProvider.getCheckpoint({selector: {code: barcode}}).then((checkpoint:Checkpoint) => {
      LogService.log("Found Checkpoint: " + checkpoint.id);
      this.messages.push("locale identificato");

      this.registerNewCheckinForCheckpoint(checkpoint).then(() => {
        LogService.log('Checkpoint registration OK');
        this.codeScanService.setCodeScanInProgress(false);
        this.navCtrl.setRoot(HomePage).then(() => {
          LogService.log("--- RESET HOME ---");
        });
      }, (e) => {
        LogService.error(e);
      });
    }, (e) => {
      LogService.error(e);
    });
  }
}
