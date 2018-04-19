var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
/* CORE */
import { Component } from '@angular/core';
import { IonicPage, LoadingController, ModalController, NavController, Platform, ToastController } from 'ionic-angular';
import { Insomnia } from '@ionic-native/insomnia';
/* SERVICES */
import { ConfigurationService } from '../../../services/configuration.service';
import { UserService } from '../../../services/user.service';
import { RemoteDataService } from '../../../services/remote.data.service';
import { BackgroundService } from "../../../services/background.service";
import { OfflineCapableRestService } from '../../../services/offline.capable.rest.service';
import { LogService } from "../../../services/log.service";
/* PAGES */
import { ConfigurationUnlockerPage } from '../configuration.unlocker/configuration.unlocker';
import { ConfigurationSyncstatePage } from "../configuration.syncstate/configuration.syncstate";
/* OTHER */
import _ from "lodash";
var ConfigurationSettingsPage = /** @class */ (function () {
    function ConfigurationSettingsPage(navCtrl, platform, toastCtrl, modalCtrl, loadingCtrl, insomnia, configurationService, userService, remoteDataService, backgroundService, offlineCapableRestService) {
        this.navCtrl = navCtrl;
        this.platform = platform;
        this.toastCtrl = toastCtrl;
        this.modalCtrl = modalCtrl;
        this.loadingCtrl = loadingCtrl;
        this.insomnia = insomnia;
        this.configurationService = configurationService;
        this.userService = userService;
        this.remoteDataService = remoteDataService;
        this.backgroundService = backgroundService;
        this.offlineCapableRestService = offlineCapableRestService;
        this.viewNotReadyText = "Caricamento in corso...";
        //
    }
    /**
     * Save configuration values and reset application
     *
     * @returns {Promise<any>}
     */
    ConfigurationSettingsPage.prototype.saveAndResetApplication = function () {
        var self = this;
        this.viewIsReady = false;
        this.viewNotReadyText = "Configurazione in corso...";
        return new Promise(function (resolve) {
            if (!self.offlineCapableRestService.isNetworkConnected()) {
                var toast = self.toastCtrl.create({
                    message: "Nessuna connessione! Connettiti alla rete e riprova.",
                    duration: 5000,
                    position: 'top'
                });
                toast.present().then(function () {
                    resolve();
                });
                return;
            }
            LogService.log("Stopping background service...");
            self.backgroundService.stop().then(function () {
                self.configurationService.setMultipleConfigs(self.cfg).then(function () {
                    self.configurationService.unlockWithCode(""); //lock it
                    self.backgroundService.start().then(function () {
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
    };
    /**
     * Ask user for unlock code and attempt to unlock the configuration service
     */
    ConfigurationSettingsPage.prototype.onUnlockConfigForm = function () {
        var _this = this;
        var unlockModal = this.modalCtrl.create(ConfigurationUnlockerPage, false, {});
        unlockModal.onDidDismiss(function (data) {
            var unlock_code = _.get(data, "unlock_code", "");
            _this.configurationService.unlockWithCode(unlock_code);
            if (!_this.configurationService.isUnlocked()) {
                var toast = _this.toastCtrl.create({
                    message: 'Codice sblocco errato!',
                    duration: 3000,
                    position: 'top'
                });
                toast.present();
            }
        });
        unlockModal.present();
    };
    /**
     * Lock the configuration service
     */
    ConfigurationSettingsPage.prototype.onLockConfigForm = function () {
        this.configurationService.unlockWithCode("");
    };
    /**
     *
     * @returns {boolean}
     */
    ConfigurationSettingsPage.prototype.isFormDisabled = function () {
        return !this.configurationService.isUnlocked();
    };
    /**
     *
     */
    ConfigurationSettingsPage.prototype.getConfiguration = function () {
        var _this = this;
        this.viewIsReady = false;
        this.viewNotReadyText = "Caricamento in corso...";
        this.configurationService.getConfigObject().then(function (config) {
            _this.cfg = config;
            _this.viewIsReady = true;
        }, function () {
            _this.cfg = {};
        });
    };
    ConfigurationSettingsPage.prototype.ngOnInit = function () {
        this.getConfiguration();
    };
    ConfigurationSettingsPage = __decorate([
        IonicPage(),
        Component({
            selector: 'page-configuration-settings',
            template: "\n    <ion-content *ngIf=\"viewIsReady\">\n\n      <h1 class=\"tab-title\">\n        Impostazioni applicazione\n      </h1>\n\n      <!-- Unlock buttons-->\n      <div class=\"buttons unlock-buttons\" *ngIf=\"isFormDisabled()\" text-center align-items-center>\n        <button ion-button icon-left (click)=\"onUnlockConfigForm()\" color=\"danger\">\n          <ion-icon name=\"unlock\"></ion-icon>\n          <ion-label>Sblocca</ion-label>\n        </button>\n      </div>\n\n      <!-- Lock buttons-->\n      <div class=\"buttons lock-buttons\" *ngIf=\"!isFormDisabled()\" text-center align-items-center>\n        <button ion-button icon-left (click)=\"onLockConfigForm()\">\n          <ion-icon name=\"lock\"></ion-icon>\n          <ion-label>Blocca</ion-label>\n        </button>\n\n        <button ion-button icon-left (click)=\"cleanCache()\" color=\"yellow-light\">\n          <ion-icon name=\"warning\"></ion-icon>\n          <ion-label>Ricarica dati dal server</ion-label>\n        </button>\n      </div>\n\n      <ion-list>\n\n        <ion-list-header>Applicazione</ion-list-header>\n        <ion-item>\n          <ion-label stacked>Url applicazione</ion-label>\n          <ion-input [(ngModel)]=\"cfg.crm_url\" [disabled]=\"isFormDisabled()\"></ion-input>\n        </ion-item>\n        <ion-item>\n          <ion-label stacked>Versione Rest API</ion-label>\n          <ion-input [(ngModel)]=\"cfg.api_version\" [disabled]=\"isFormDisabled()\"></ion-input>\n        </ion-item>\n\n        <ion-list-header>Utente</ion-list-header>\n        <ion-item>\n          <ion-label stacked>Nome utente</ion-label>\n          <ion-input [(ngModel)]=\"cfg.crm_username\" [disabled]=\"isFormDisabled()\"></ion-input>\n        </ion-item>\n        <ion-item>\n          <ion-label stacked>Password</ion-label>\n          <ion-input type=\"password\" [(ngModel)]=\"cfg.crm_password\" [disabled]=\"isFormDisabled()\"></ion-input>\n        </ion-item>\n\n        <ion-list-header>Altro</ion-list-header>\n        <ion-item>\n          <ion-label stacked>Livello di logging</ion-label>\n          <ion-select [(ngModel)]=\"cfg.log_level\" [disabled]=\"isFormDisabled()\">\n            <ion-option value=\"NONE\">Nessuno</ion-option>\n            <ion-option value=\"INFO\">Info</ion-option>\n            <ion-option value=\"WARN\">Avviso</ion-option>\n            <ion-option value=\"ERROR\">Errore</ion-option>\n          </ion-select>\n        </ion-item>\n\n      </ion-list>\n\n      <div class=\"buttons save-buttons\" *ngIf=\"!isFormDisabled()\" text-center align-items-center>\n        <hr />\n        <button ion-button icon-left (click)=\"saveAndResetApplication()\" color=\"dark\">\n          <ion-icon name=\"thumbs-up\"></ion-icon>\n          <ion-label>Salva</ion-label>\n        </button>\n      </div>\n\n    </ion-content>\n\n    <ion-content *ngIf=\"!viewIsReady\">\n      <h1 class=\"loading\">{{viewNotReadyText}}</h1>\n    </ion-content>\n  "
        }),
        __metadata("design:paramtypes", [NavController,
            Platform,
            ToastController,
            ModalController,
            LoadingController,
            Insomnia,
            ConfigurationService,
            UserService,
            RemoteDataService,
            BackgroundService,
            OfflineCapableRestService])
    ], ConfigurationSettingsPage);
    return ConfigurationSettingsPage;
}());
export { ConfigurationSettingsPage };
//# sourceMappingURL=configuration.settings.js.map