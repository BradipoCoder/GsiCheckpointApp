/* CORE */
import {Component, OnInit} from '@angular/core';
import {NavController, ModalController, ToastController, LoadingController} from 'ionic-angular';
import { Insomnia } from '@ionic-native/insomnia';
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
  private cfg: any;

  private viewIsReady: boolean;

  constructor(private navCtrl: NavController
    , private toastCtrl: ToastController
    , private modalCtrl: ModalController
    , private loadingCtrl: LoadingController
    , private insomnia: Insomnia
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

      self.insomnia.keepAwake().then(() => {
        LogService.log("KEEP AWAKE ON!");
      });


      let loaderContent = "<strong>Eliminazione cache</strong><br />";
      let msg;

      let loader = self.loadingCtrl.create({
        content: loaderContent,
        duration: (5 * 60 * 1000)
      });

      loader.onDidDismiss((data, role) => {
        self.navCtrl.push(ConfigurationPage).then(() => {
          LogService.log("CACHE CLEAR - LOADER DISMISSED");
        });
      });

      loader.present().then(() => {

        self.backgroundService.lockSyncPage();

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
        msg = "Configuring user...";
        LogService.log(msg);
        loader.setContent(loaderContent + msg);
        return self.userService.configureWithOfflineUserData();
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
        loader.dismiss().then(() => {
          LogService.log("CACHE CLEAR OK", LogService.LEVEL_WARN);
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
   *
   * @returns {Promise<any>}
   */
  saveAndResetApplication():  Promise<any>
  {
    let self = this;

    return new Promise(function (resolve, reject) {
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

      let loaderContent = "<strong>Salvataggio configurazione</strong><br />";
      let loader = self.loadingCtrl.create({
        content: loaderContent,
        duration: (5 * 60 * 1000)
      });

      loader.onDidDismiss((data, role) => {
        LogService.log("APPLICATION RESET- LOADER DISMISSED");
      });

      loader.present().then(() =>
      {
        LogService.log("Stopping background service...");
        self.backgroundService.stop().then(() => {
          self.configurationService.setMultipleConfigs(self.cfg).then(() =>
          {
            self.configurationService.unlockWithCode("");//lock it
            LogService.log("Configuration values were saved.");
            return self.cleanCache();
          }).then(() => {
            loader.dismiss().then(() => {
              LogService.log("APPLICATION RESET OK", LogService.LEVEL_WARN);
            });
          });
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
