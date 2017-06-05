import {Component, OnInit} from '@angular/core';
import {NavController, ModalController} from 'ionic-angular';
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
  canModify:boolean;

  constructor(
    public navCtrl: NavController,
    public modalCtrl: ModalController,
    private configurationService:ConfigurationService
  )
  {
    this.viewIsReady = false;
    this.canModify = false;
  }

  isFormDisabled():any
  {
    return this.canModify ? "false" : "disabled";
  }

  getConfiguration():void {
    this.configurationService.getConfigObject().then((config) => {
      this.cfg = config;
      this.viewIsReady = true;
    }).catch((e) => {
      this.cfg = {};
    });
  }

  onModsToggle(value):void
  {
    let unlockModal = this.modalCtrl.create(ConfigurationUnlockerPage, { userId: 8675309 });
    unlockModal.onDidDismiss(data => {
      let unlock_code_ok = (_.has(data, "unlock_code") && _.get(data, "unlock_code") == _.get(this.cfg, "unlock_code"));
      this.canModify = unlock_code_ok;
    });
    unlockModal.present();
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
