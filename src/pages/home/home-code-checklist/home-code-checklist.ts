/* Import: Core */
import {Component, OnInit} from '@angular/core';
import {IonicPage, AlertController, NavController} from 'ionic-angular';
/* Import: services */
import {CodeScanService} from '../../../services/code.scan.service';
import {RemoteDataService} from "../../../services/remote.data.service";
import {LogService} from '../../../services/log.service';
/* Import: providers */
import {CheckpointProvider} from "../../../providers/checkpoint.provider";
import {CheckinProvider} from "../../../providers/checkin.provider";
/* Import: models */
import {Checkpoint} from "../../../models/Checkpoint";
/* Import: pages */
import {HomePage} from "../home";
import {Checkin} from "../../../models/Checkin";
/* Import: utilities */
import _ from "lodash";

@IonicPage()
@Component({
  selector: 'page-home-code-checklist',
  template: `
    <ion-content text-center>

      <ion-grid margin-top>
        <ion-row>
          <ion-col>
            <!--CHECKLIST-->
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>
  `
})
export class HomeCodeChecklistPage implements OnInit
{
  private messages: any = [];

  constructor(protected navCtrl: NavController
    , protected alertCtrl: AlertController
    , protected codeScanService: CodeScanService
    , protected remoteDataService: RemoteDataService
    , protected checkpointProvider: CheckpointProvider
    , protected checkinProvider: CheckinProvider
  )
  {
  }

  /**
   *
   * @param {Checkin} checkin
   * @param {Checkpoint} checkpoint
   * @returns {Promise<any>}
   */
  protected handleCheckpointChecklistSelection(checkin: Checkin, checkpoint: Checkpoint): Promise<any>
  {
    let self = this;
    let alert;

    return new Promise(function (resolve, reject) {
      if (!checkpoint.hasChecklistValues())
      {
        LogService.log('This checkpoint has no associated checklist. Skipping.');
        resolve();
        return;
      }

      alert = self.alertCtrl.create({
        title: 'RIFORNIMENTO - ' + checkpoint.code,
        subTitle: 'clicca sulle voci che hai rifornito',
        enableBackdropDismiss: false
      });

      let checked: boolean;
      _.each(checkpoint.checklist_items, (label, key) => {
        checked = checkin.hasChecklistValue(key);
        alert.addInput({
          type: 'checkbox',
          label: label,
          value: key,
          checked: checked,
        });
      });

      alert.addButton({
        text: 'Fatto',
        handler: (selectedValues: any) => {
          LogService.log('SELECTED CHECKLIST VALUES: ' + JSON.stringify(selectedValues));
          checkin.setChecklistItemsFromArray(selectedValues);

          self.checkinProvider.store(checkin, true).then(() => {
            LogService.log('Checkin stored.');
            resolve();
          }, (e) => {
            reject(e);
          });
        }
      });

      alert.present();
    });
  }

  ngOnInit(): void
  {
    this.messages = [];
    let checkin = this.remoteDataService.getCheckinToModify();
    let checkpoint = checkin.getCheckpoint();

    LogService.log("MODIFYING CHECKIN: " + checkin.id);

    this.handleCheckpointChecklistSelection(checkin, checkpoint).then(() => {
      LogService.log('Checklist OK');
      this.remoteDataService.setCheckinToModify(null);
      this.navCtrl.setRoot(HomePage).then(() => {
        LogService.log("--- RESET HOME ---");
      });
    }, (e) => {
      this.remoteDataService.setCheckinToModify(null);
      LogService.error(e);
    });
  }
}
