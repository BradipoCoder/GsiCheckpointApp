import {Component, OnInit} from '@angular/core';
import {NavController, ModalController, ToastController} from 'ionic-angular';
import {ConfigurationService} from '../../services/configuration.service';
import {UserService} from '../../services/user.service';
import {RemoteDataService} from '../../services/remote.data.service';
import {ConfigurationUnlockerPage} from './configuration.unlocker';
import MekitTracerApp from '../../app/app.component';
import {HomePage} from "../home/home";
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
    private configurationService:ConfigurationService,
    private userService:UserService,
    private remoteDataService: RemoteDataService
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

  resetApplication():void
  {
    this.configurationService.unlockWithCode("");//block it
    this.userService.logout().then(() => {
      console.log("User is now logged out.");
      return this.userService.initialize();
    }).then(() =>
    {
      console.log("User service initialized.");
      return this.remoteDataService.initialize();
    }).then(() =>
    {
      console.log("RemoteData service initialized.");
      console.log("APPLICATION RESET OK");
      this.navCtrl.push(HomePage);
      this.navCtrl.setRoot(HomePage);
    });
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
    console.log("CONFINIT");
    this.getConfiguration();
  }


}
