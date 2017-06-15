import {Component, OnInit} from '@angular/core';
import {NavController, ModalController, ToastController} from 'ionic-angular';
import {ConfigurationService} from '../../services/configuration.service';
import {ConfigurationUnlockerPage} from './configuration.unlocker';
import _ from "lodash";


@Component({
  selector: 'page-configuration',
  templateUrl: 'configuration.html'
})
export class ConfigurationPage implements OnInit
{
  cfg:any;
  viewIsReady:boolean;

  constructor(
    public navCtrl: NavController,
    private toastCtrl: ToastController,
    public modalCtrl: ModalController,
    private configurationService:ConfigurationService
  )
  {
    this.viewIsReady = false;
  }

  isFormDisabled():boolean
  {
    return !this.configurationService.isUnlocked();
  }

  getConfiguration():void {
    this.configurationService.getConfigObject().then((config) => {
      this.cfg = config;
      this.viewIsReady = true;
    }).catch((e) => {
      this.cfg = {};
    });
  }

  /**
   * Ask user for unlock code and attempt to unlock the configuration service
   * @param value
   */
  onUnlockConfigForm(value):void
  {
    let unlockModal = this.modalCtrl.create(ConfigurationUnlockerPage);
    unlockModal.onDidDismiss(data => {
      let unlock_code = _.get(data, "unlock_code", "");
      this.configurationService.unlockWithCode(unlock_code);
      if(!this.configurationService.isUnlocked()) {
        let toast = this.toastCtrl.create({
          message: 'Codice sblocco errato!',
          duration: 3000,
          position: 'top'
        });
        toast.present();
      }
    });
    unlockModal.present();
  }

  /**
   * Lock the configuration service
   * @param value
   */
  onLockConfigForm(value):void
  {
    this.configurationService.unlockWithCode("");
  }

  onConfigChange(key, newValue):void
  {
    let self = this;
    this.configurationService.setConfig(key, newValue).then((savedValue) => {
        _.set(self.cfg, key, savedValue);
    });
  }

  ngOnInit():void
  {
    this.getConfiguration();
  }


}
