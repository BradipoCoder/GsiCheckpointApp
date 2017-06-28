import {Component, OnInit} from '@angular/core';
import {NavController, ModalController, ToastController, LoadingController} from 'ionic-angular';
import {ConfigurationService} from '../../services/configuration.service';
import {UserService} from '../../services/user.service';
import {RemoteDataService} from '../../services/remote.data.service';
import {ConfigurationUnlockerPage} from './configuration.unlocker';
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
    public navCtrl: NavController
    , private toastCtrl: ToastController
    , public modalCtrl: ModalController
    , private loadingCtrl: LoadingController
    , private configurationService:ConfigurationService
    , private userService:UserService
    , private remoteDataService: RemoteDataService
  )
  {
    this.viewIsReady = false;
  }

  /**
   * destroy and recreate databases
   */
  cleanCache():void
  {
    let self = this;
    let loader = this.loadingCtrl.create({
      content: "Elaborazione in corso...",
      duration: 60000
    });
    loader.present();

    this.remoteDataService.cleanCache().then(() =>
    {
      console.log("CACHE WAS CLEANED");
      return this.remoteDataService.initialize();
    }).then(() => {
      console.log("RemoteData service initialized.");
      this.navCtrl.push(HomePage);
      this.navCtrl.setRoot(HomePage);
      loader.dismiss();
    }).catch((e) =>
    {
      loader.dismiss();
      let toast = this.toastCtrl.create({
        message: e,
        duration: 5000,
        position: 'top'
      });
      toast.present();
      console.log("Cache clean error: " + e);
    });
  }

  /**
   * Save configuration values and reset application
   */
  saveAndResetApplication():void
  {
    let self = this;
    let loader = this.loadingCtrl.create({
      content: "Elaborazione in corso...",
      duration: 30000
    });
    loader.present();

    //save all config values
    let setPromises = [];
    _.each(this.cfg, function(val, key)
    {
      setPromises.push(self.configurationService.setConfig(key, val));
    });

    Promise.all(setPromises).then(() =>
    {
      this.configurationService.unlockWithCode("");//lock it
      console.log("Configuration values were saved.");

      return this.userService.logout();
    }).then(() => {
      console.log("User is now logged out.");

      return this.userService.initialize();
    }).then(() =>
    {
      console.log("User service initialized.");

      return this.remoteDataService.cleanCache();
    }).then(() =>
    {
      console.log("Cache was cleaned.");

      return this.remoteDataService.initialize();
    }).then(() =>
    {
      console.log("RemoteData service initialized.");

      this.navCtrl.push(HomePage);
      this.navCtrl.setRoot(HomePage);
      loader.dismiss();

      console.log("APPLICATION RESET OK");
    }).catch((e) =>
    {
      loader.dismiss();
      console.log("Config save error: " + e);
    });
  }

  /**
   * Ask user for unlock code and attempt to unlock the configuration service
   */
  onUnlockConfigForm():void
  {
    let unlockModal = this.modalCtrl.create(ConfigurationUnlockerPage, false, {});
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
   */
  onLockConfigForm():void
  {
    this.configurationService.unlockWithCode("");
  }

  /**
   *
   * @returns {boolean}
   */
  isFormDisabled():boolean
  {
    return !this.configurationService.isUnlocked();
  }

  /**
   *
   */
  private getConfiguration():void {
    this.configurationService.getConfigObject().then((config) => {
      this.cfg = config;
      this.viewIsReady = true;
    }).catch((e) => {
      this.cfg = {};
    });
  }

  ngOnInit():void
  {
    this.getConfiguration();
  }
}
