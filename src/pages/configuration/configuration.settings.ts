/* CORE */
import {Component, OnInit} from '@angular/core';
import {NavController, ViewController, ModalController, ToastController, LoadingController} from 'ionic-angular';
/* SERVICES */
import {ConfigurationService} from '../../services/configuration.service';
import {UserService} from '../../services/user.service';
import {RemoteDataService} from '../../services/remote.data.service';
import {BackgroundService} from "../../services/background.service";
import {OfflineCapableRestService} from '../../services/offline.capable.rest.service';
import {LogService} from "../../services/log.service";
/* PAGES */
import {ConfigurationPage} from './configuration';
import {ConfigurationSyncstatePage} from './configuration.syncstate';
import {ConfigurationUnlockerPage} from './configuration.unlocker';
import {HomePage} from "../home/home";
/* OTHER */
import _ from "lodash";


@Component({
  selector: 'page-configuration-settings',
  templateUrl: 'configuration.settings.html'
})
export class ConfigurationSettingsPage implements OnInit
{
  cfg: any;
  viewIsReady: boolean;

  constructor(private navCtrl: NavController
    , private toastCtrl: ToastController
    , private modalCtrl: ModalController
    , private loadingCtrl: LoadingController
    , private configurationService: ConfigurationService
    , private userService: UserService
    , private remoteDataService: RemoteDataService
    , private backgroundService: BackgroundService
    , private offlineCapableRestService: OfflineCapableRestService)
  {
    this.viewIsReady = false;
  }


  /**
   * !!! NETWORK CONNECTION REQUIRED !!!
   * destroy and recreate databases and load remote data
   *
   * @returns {Promise<any>}
   */
  cleanCache(): Promise<any>
  {
    let self = this;

    return new Promise(function (resolve, reject)
    {
      if (!self.offlineCapableRestService.isNetworkConnected())
      {
        let toast = self.toastCtrl.create({
          message: "Nessuna connessione! Connettiti alla rete e riprova.",
          duration: 5000,
          position: 'top'
        });
        toast.present().then(() => {
          resolve();
        });
        return;
      }

      let loaderContent = "<strong>Eliminazione cache</strong><br />";
      let msg;

      let loader = self.loadingCtrl.create({
        content: loaderContent,
        duration: (5 * 60 * 1000)
      });

      loader.onDidDismiss((data, role) => {
        LogService.log("CACHE CLEAR - LOADER DISMISSED");
        self.backgroundService.unlockSyncPage();
        self.navCtrl.push(ConfigurationPage);
      });


      loader.present().then(() => {

        //@todo: enable this
        //self.backgroundService.lockSyncPage();

        msg = "Stopping background service...";
        LogService.log(msg);
        loader.setContent(loaderContent + msg);
        return self.backgroundService.stop();
      }).then(() =>
      {
        msg = "Resetting provider sync offsets...";
        LogService.log(msg);
        loader.setContent(loaderContent + msg);
        return self.backgroundService.resetDataProvidersSyncOffset();
      }).then(() =>
      {
        msg = "Logging out user...";
        LogService.log(msg);
        loader.setContent(loaderContent + msg);
        return self.userService.logout();
      }).then(() =>
      {
        msg = "Initializing user service...";
        LogService.log(msg);
        loader.setContent(loaderContent + msg);
        return self.userService.initialize();
      }).then(() =>
      {
        msg = "Logging in user...";
        LogService.log(msg);
        loader.setContent(loaderContent + msg);
        return self.userService.login(self.cfg.crm_username, self.cfg.crm_password);
      }).then(() =>
      {
        msg = "Destroying databases...";
        LogService.log(msg);
        loader.setContent(loaderContent + msg);
        return self.remoteDataService.destroyLocalDataStorages();
      }).then(() =>
      {
        msg = "Initializing remote data service...";
        LogService.log(msg);
        loader.setContent(loaderContent + msg);
        return self.remoteDataService.initialize();
      }).then(() =>
      {
        msg = "Starting background service...";
        LogService.log(msg);
        loader.setContent(loaderContent + msg);
        self.backgroundService.setSyncIntervalFast();
        return self.backgroundService.start();
      }).then(() =>
      {
        msg = "Cache cleared.";
        LogService.log("Cache cleared.");
        loader.dismiss().then(() => {
          resolve();
        });
      }).catch((e) => {
        let toast = self.toastCtrl.create({
          message: e,
          duration: 15000,
          position: 'top'
        });
        toast.present().then(() => {
          LogService.log("Cache clean error: " + e);
          loader.dismiss().then(() => {
            reject(e);
          });
        });
      });
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
      LogService.log("Stopping background service...");
      return this.backgroundService.stop();
    }).then(() =>
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
        LogService.log("Configuration values were saved.");

        return this.userService.logout();
      }).then(() =>
      {
        LogService.log("User is now logged out.");

        return this.userService.login(this.cfg.crm_username, this.cfg.crm_password);
      }).then(() =>
      {
        LogService.log("User is now logged in.");
        return this.userService.initialize();
      }).then(() =>
      {
        LogService.log("Starting background service...");
        return this.backgroundService.start();
      }).then(() =>
      {
        return loader.dismiss();
      }).then(() =>
      {
        LogService.log("APPLICATION RESET OK");
        self.cleanCache();
      }).catch((e) =>
      {
        loader.dismiss().then(() =>
        {
          LogService.log("Application reset error: " + e);
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

  public ngOnInit(): void
  {
    this.getConfiguration();
  }
}
