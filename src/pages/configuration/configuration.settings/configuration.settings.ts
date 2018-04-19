/* CORE */
import {Component, OnInit} from '@angular/core';
import {IonicPage, LoadingController, ModalController, NavController, Platform, ToastController} from 'ionic-angular';
import {Insomnia} from '@ionic-native/insomnia';
/* SERVICES */
import {ConfigurationService} from '../../../services/configuration.service';
import {UserService} from '../../../services/user.service';
import {RemoteDataService} from '../../../services/remote.data.service';
import {BackgroundService} from "../../../services/background.service";
import {OfflineCapableRestService} from '../../../services/offline.capable.rest.service';
import {LogService} from "../../../services/log.service";
/* PAGES */
import {ConfigurationUnlockerPage} from '../configuration.unlocker/configuration.unlocker';
import {ConfigurationSyncstatePage} from "../configuration.syncstate/configuration.syncstate";
/* OTHER */
import _ from "lodash";


@IonicPage()
@Component({
  selector: 'page-configuration-settings',
  template: `
    <ion-content *ngIf="viewIsReady">

      <h1 class="tab-title">
        Impostazioni applicazione
      </h1>

      <!-- Unlock buttons-->
      <div class="buttons unlock-buttons" *ngIf="isFormDisabled()" text-center align-items-center>
        <button ion-button icon-left (click)="onUnlockConfigForm()" color="danger">
          <ion-icon name="unlock"></ion-icon>
          <ion-label>Sblocca</ion-label>
        </button>
      </div>

      <!-- Lock buttons-->
      <div class="buttons lock-buttons" *ngIf="!isFormDisabled()" text-center align-items-center>
        <button ion-button icon-left (click)="onLockConfigForm()">
          <ion-icon name="lock"></ion-icon>
          <ion-label>Blocca</ion-label>
        </button>

        <button ion-button icon-left (click)="cleanCache()" color="yellow-light">
          <ion-icon name="warning"></ion-icon>
          <ion-label>Ricarica dati dal server</ion-label>
        </button>
      </div>

      <ion-list>

        <ion-list-header>Applicazione</ion-list-header>
        <ion-item>
          <ion-label stacked>Url applicazione</ion-label>
          <ion-input [(ngModel)]="cfg.crm_url" [disabled]="isFormDisabled()"></ion-input>
        </ion-item>
        <ion-item>
          <ion-label stacked>Versione Rest API</ion-label>
          <ion-input [(ngModel)]="cfg.api_version" [disabled]="isFormDisabled()"></ion-input>
        </ion-item>

        <ion-list-header>Utente</ion-list-header>
        <ion-item>
          <ion-label stacked>Nome utente</ion-label>
          <ion-input [(ngModel)]="cfg.crm_username" [disabled]="isFormDisabled()"></ion-input>
        </ion-item>
        <ion-item>
          <ion-label stacked>Password</ion-label>
          <ion-input type="password" [(ngModel)]="cfg.crm_password" [disabled]="isFormDisabled()"></ion-input>
        </ion-item>

        <ion-list-header>Altro</ion-list-header>
        <ion-item>
          <ion-label stacked>Livello di logging</ion-label>
          <ion-select [(ngModel)]="cfg.log_level" [disabled]="isFormDisabled()">
            <ion-option value="NONE">Nessuno</ion-option>
            <ion-option value="INFO">Info</ion-option>
            <ion-option value="WARN">Avviso</ion-option>
            <ion-option value="ERROR">Errore</ion-option>
          </ion-select>
        </ion-item>

      </ion-list>

      <div class="buttons save-buttons" *ngIf="!isFormDisabled()" text-center align-items-center>
        <hr />
        <button ion-button icon-left (click)="saveAndResetApplication()" color="dark">
          <ion-icon name="thumbs-up"></ion-icon>
          <ion-label>Salva</ion-label>
        </button>
      </div>

    </ion-content>

    <ion-content *ngIf="!viewIsReady">
      <h1 class="loading">{{viewNotReadyText}}</h1>
    </ion-content>
  `
})
export class ConfigurationSettingsPage implements OnInit
{
  private cfg: any;

  private viewIsReady: boolean;
  private viewNotReadyText:string  = "Caricamento in corso...";

  constructor(private navCtrl: NavController
    , private platform: Platform
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
    //
  }

  /**
   * Save configuration values and reset application
   *
   * @returns {Promise<any>}
   */
  saveAndResetApplication(): Promise<any>
  {
    let self = this;

    this.viewIsReady = false;
    this.viewNotReadyText = "Configurazione in corso...";

    return new Promise(function (resolve) {
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

      LogService.log("Stopping background service...");
      self.backgroundService.stop().then(() => {
        self.configurationService.setMultipleConfigs(self.cfg).then(() => {
          self.configurationService.unlockWithCode("");//lock it
          self.backgroundService.start().then(() => {
            LogService.log("Configuration values were saved.");
            self.viewIsReady = true;
            self.backgroundService.applicationResetRequested = true;
            LogService.log("APPLICATION RESET REQUESTED", LogService.LEVEL_WARN);
            self.navCtrl.setRoot(ConfigurationSyncstatePage);
            resolve();
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
    unlockModal.onDidDismiss(data => {
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
    this.viewIsReady = false;
    this.viewNotReadyText = "Caricamento in corso...";
    this.configurationService.getConfigObject().then((config) => {
      this.cfg = config;
      this.viewIsReady = true;
    }, () => {
      this.cfg = {};
    });
  }

  public ngOnInit(): void
  {
    this.getConfiguration();
  }
}
