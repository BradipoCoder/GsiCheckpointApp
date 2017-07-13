import {Component, OnInit} from '@angular/core';
import {NavController, ModalController, ToastController, LoadingController} from 'ionic-angular';
import {ConfigurationService} from '../../services/configuration.service';
import {UserService} from '../../services/user.service';
import {RemoteDataService} from '../../services/remote.data.service';
import {OfflineCapableRestService} from '../../services/offline.capable.rest.service';
import {ConfigurationUnlockerPage} from './configuration.unlocker';
import {HomePage} from "../home/home";
import _ from "lodash";


@Component({
  selector: 'page-configuration',
  templateUrl: 'configuration.html'
})
export class ConfigurationPage implements OnInit
{
  cfg: any;
  viewIsReady: boolean;

  constructor(public navCtrl: NavController
    , private toastCtrl: ToastController
    , public modalCtrl: ModalController
    , private loadingCtrl: LoadingController
    , private configurationService: ConfigurationService
    , private userService: UserService
    , private remoteDataService: RemoteDataService
    , public offlineCapableRestService: OfflineCapableRestService)
  {
    this.viewIsReady = false;
  }

  /**
   * !!! NETWORK CONNECTION REQUIRED !!!
   * destroy and recreate databases and load remote data
   */
  cleanCache(): void
  {
    if (!this.offlineCapableRestService.isNetworkConnected())
    {
      let toast = this.toastCtrl.create({
        message: "Nessuna connessione! Connettiti alla rete e riprova.",
        duration: 5000,
        position: 'top'
      });
      toast.present();
      return;
    }

    let loaderContent = "<strong>Eliminazione cache</strong><br />";
    let msg;
    let self = this;

    let loader = this.loadingCtrl.create({
      content: loaderContent,
      duration: (5 * 60 * 1000)
    });
    loader.present().then(() =>
    {
      msg = "Logging out user...";
      console.log(msg);
      loader.setContent(loaderContent + msg);
      return this.userService.logout();
    }).then(() =>
    {
      msg = "Logging in user...";
      console.log(msg);
      loader.setContent(loaderContent + msg);
      return this.userService.login(this.cfg.crm_username, this.cfg.crm_password);
    }).then(() =>
    {
      msg = "Destroying databases...";
      console.log(msg);
      loader.setContent(loaderContent + msg);
      return this.remoteDataService.destroyLocalDataStorages();
    }).then(() =>
    {
      msg = "Loading data...";
      console.log(msg);
      loader.setContent(loaderContent + msg);
      return this.remoteDataService.initialize(true);
    }).then(() =>
    {
      msg = "Initializing remote data service...";
      console.log(msg);
      loader.setContent(loaderContent + msg);
      return this.remoteDataService.initialize(false, true);
    }).then(() =>
    {
      msg = "Cache cleared.";
      console.log(msg);
      loader.setContent(loaderContent + msg);
      this.navCtrl.push(HomePage);
      this.navCtrl.setRoot(HomePage);
      loader.dismiss();
    }).catch((e) => {
      let toast = this.toastCtrl.create({
        message: e,
        duration: 15000,
        position: 'top'
      });
      toast.present().then(() => {
        console.log("Cache clean error: " + e);
        loader.dismiss();
      });
    });
  }

  /**
   * !!! NETWORK CONNECTION REQUIRED !!!
   * destroy and recreate databases and load remote data
   */
  cleanCacheOld(): void
  {
    if(!this.offlineCapableRestService.isNetworkConnected())
    {
      let toast = this.toastCtrl.create({
        message: "Nessuna connessione! Connettiti alla rete e riprova.",
        duration: 5000,
        position: 'top'
      });
      toast.present();
      return;
    }

    let loaderContent = "<strong>Eliminazione cache</strong><br />";
    let msg;
    let self = this;
    let loader = this.loadingCtrl.create({
      content: loaderContent,
      duration: (5 * 60 * 1000)
    });
    loader.present().then(() =>
    {
      msg = "Destroying databases...";
      console.log(msg);
      loader.setContent(loaderContent + msg);
      return this.remoteDataService.destroyLocalDataStorages();
    }).then(() =>
    {
      msg = "Loading data...";
      console.log(msg);
      loader.setContent(loaderContent + msg);

      return this.remoteDataService.initialize(true);
    }).then(() =>
    {
      msg = "Initializing...";
      console.log(msg);
      loader.setContent(loaderContent + msg);

      return this.remoteDataService.initialize(false, true);
    }).then(() =>
    {
      msg = "Cache cleared.";
      console.log(msg);
      loader.dismiss().then(() => {
        this.navCtrl.push(HomePage).then(() => {
          this.navCtrl.setRoot(HomePage).then(() => {
            console.log("going home...");
          });
        });
      });
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
  saveAndResetApplication(): void
  {
    if(!this.offlineCapableRestService.isNetworkConnected())
    {
      let toast = this.toastCtrl.create({
        message: "Nessuna connessione! Connettiti alla rete e riprova.",
        duration: 5000,
        position: 'top'
      });
      toast.present();
      return;
    }

    let self = this;
    let loader = this.loadingCtrl.create({
      content: "Elaborazione in corso...",
      duration: (5 * 60 * 1000)
    });
    loader.present().then(() =>
    {
      //save all config values
      let setPromises = [];
      _.each(this.cfg, function (val, key)
      {
        setPromises.push(self.configurationService.setConfig(key, val));
      });

      Promise.all(setPromises).then(() =>
      {
        this.configurationService.unlockWithCode("");//lock it
        console.log("Configuration values were saved.");

        return this.userService.logout();
      }).then(() =>
      {
        console.log("User is now logged out.");

        return this.userService.login(this.cfg.crm_username, this.cfg.crm_password);
      }).then(() =>
      {
        console.log("User is now logged in.");
        return this.userService.initialize();
      }).then(() =>
      {
        console.log("User service initialized.");
        return loader.dismiss();
      }).then(() =>
      {
        console.log("APPLICATION RESET OK");
        self.cleanCache();
      }).catch((e) =>
      {
        loader.dismiss().then(() =>
        {
          console.log("Application reset error: " + e);
          let toast = this.toastCtrl.create({
            message: 'Errore configurazione app! ' + e,
            duration: 15000,
            position: 'top'
          });
          toast.present();
        });
      });
    });
  }

  /**
   * Ask user for unlock code and attempt to unlock the configuration service
   */
  onUnlockConfigForm(): void
  {
    let unlockModal = this.modalCtrl.create(ConfigurationUnlockerPage, false, {});
    unlockModal.onDidDismiss(data =>
    {
      let unlock_code = _.get(data, "unlock_code", "");
      this.configurationService.unlockWithCode(unlock_code);
      if (!this.configurationService.isUnlocked())
      {
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
  onLockConfigForm(): void
  {
    this.configurationService.unlockWithCode("");
  }

  /**
   *
   * @returns {boolean}
   */
  isFormDisabled(): boolean
  {
    return !this.configurationService.isUnlocked();
  }

  /**
   *
   */
  private getConfiguration(): void
  {
    this.configurationService.getConfigObject().then((config) =>
    {
      this.cfg = config;
      this.viewIsReady = true;
    }).catch((e) =>
    {
      this.cfg = {};
    });
  }

  ngOnInit(): void
  {
    this.getConfiguration();
  }
}
