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
    let loaderContent = "<strong>Eliminazione cache</strong><br />";
    let self = this;
    let loader = this.loadingCtrl.create({
      content: loaderContent,
      duration: (5 * 60 * 1000)
    });
    loader.present().then(() => {
      loader.setContent(loaderContent + "Destroying databases...");
      return this.remoteDataService.destroyLocalDataStorages();
    }).then(() => {
      console.log("CACHE WAS CLEANED");

      loader.setContent(loaderContent + "Loading data...");
      return this.remoteDataService.initialize(true);
    }).then(() => {
      console.log("RemoteData service initialized [WITH DATA].");

      loader.setContent(loaderContent + "Initializing...");
      return this.remoteDataService.initialize(false, true);
    }).then(() => {
      console.log("RemoteData service initialized [SKIP DATA].");

      loader.setContent(loaderContent + "Cache cleared.");

      this.navCtrl.push(HomePage);
      this.navCtrl.setRoot(HomePage);
      loader.dismiss();
    }).catch((e) =>
    {
      loader.dismiss();
      let toast = this.toastCtrl.create({
        message: e,
        duration: 15000,
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
      duration: (5 * 60 * 1000)
    });
    loader.present().then(() => {
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
        loader.dismiss();
        console.log("APPLICATION RESET OK");
        self.cleanCache();
      }).catch((e) =>
      {
        loader.dismiss();
        console.log("Application reset error: " + e);
      });
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
