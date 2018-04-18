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
import { Platform, ToastController } from 'ionic-angular';
import { Insomnia } from '@ionic-native/insomnia';
/* PROVIDERS */
import { CheckpointProvider } from '../../../providers/checkpoint.provider';
import { CheckinProvider } from '../../../providers/checkin.provider';
/* SERVICES */
import { BackgroundService } from "../../../services/background.service";
import { RemoteDataService } from '../../../services/remote.data.service';
import { OfflineCapableRestService } from '../../../services/offline.capable.rest.service';
import { LogService } from "../../../services/log.service";
import { UserService } from "../../../services/user.service";
/* OTHER */
import _ from "lodash";
var ConfigurationSyncstatePage = /** @class */ (function () {
    function ConfigurationSyncstatePage(toastCtrl, platform, insomnia, checkpointProvider, checkinProvider, offlineCapableRestService, backgroundService, remoteDataService, userService) {
        this.toastCtrl = toastCtrl;
        this.platform = platform;
        this.insomnia = insomnia;
        this.checkpointProvider = checkpointProvider;
        this.checkinProvider = checkinProvider;
        this.offlineCapableRestService = offlineCapableRestService;
        this.backgroundService = backgroundService;
        this.remoteDataService = remoteDataService;
        this.userService = userService;
        this.is_in_sync = false;
        this.viewNotReadyText = "...";
        this.hasInterfaceRefreshRequest = false;
        this.isInterfaceRefreshRunning = false;
        this.viewIsReady = false;
        this.counts = {
            unsynced_count: 0,
            checkpoints: {
                server: 0,
                device: 0,
                unsynced_up: 0,
                unsynced_down: 0,
            },
            checkins: {
                server: 0,
                device: 0,
                unsynced_up: 0,
                unsynced_down: 0,
            }
        };
    }
    /* ------------------------------------------------------------------------------------------ INTERFACE ADMIN STUFF */
    ConfigurationSyncstatePage.prototype.doSomething = function () {
        this.backgroundService.syncDataProviders().then(function () {
            LogService.log("doSomething DONE.");
        }, function (e) {
            LogService.log("doSomething ERROR! " + e, LogService.LEVEL_ERROR);
        });
    };
    /**
     * Request originated from username/password configuration change
     */
    ConfigurationSyncstatePage.prototype.handleApplicationResetRequest = function () {
        var _this = this;
        this.backgroundService.lockSyncPage();
        this.viewIsReady = false;
        this.viewNotReadyText = "Riconfigurazione applicazione in corso...";
        this.unsubscribeToDataChange();
        this.killAllData().then(function () {
            _this.backgroundService.applicationResetRequested = false;
            LogService.log("APP RESET DONE");
            LogService.log("Starting background service...");
            _this.backgroundService.setSyncIntervalFast();
            return _this.backgroundService.start();
        }).then(function () {
            _this.registerInterfaceRefreshRequest();
            _this.subscribeToDataChange();
        });
    };
    /**
     *
     * @returns {Promise<any>}
     */
    ConfigurationSyncstatePage.prototype.killAllData = function () {
        var self = this;
        return new Promise(function (resolve, reject) {
            var msg = "Stopping background service...";
            LogService.log(msg);
            self.backgroundService.stop().then(function () {
                msg = "* Background service stopped.";
                LogService.log(msg);
                //
                msg = "Resetting provider sync offsets...";
                LogService.log(msg);
                return self.backgroundService.resetDataProvidersSyncOffset(); //--------------------->
            }).then(function () {
                msg = "* Provider sync offsets were reset.";
                LogService.log(msg);
                //
                msg = "Destroying databases...";
                LogService.log(msg);
                return self.remoteDataService.destroyLocalDataStorages();
            }).then(function () {
                msg = "Initializing remote data service...";
                LogService.log(msg);
                return self.remoteDataService.initialize();
            }).then(function () {
                LogService.log("DONE!", LogService.LEVEL_WARN);
                resolve();
            }).catch(function (e) {
                LogService.error(e);
                reject(e);
            });
        });
    };
    /* ------------------------------------------------------------------------------------------ INTERFACE ADMIN STUFF */
    /**
     * Do NOT use this method directly especially for repeated events (like DB CHANGE)
     * but use: registerInterfaceRefreshRequest
     *
     * @returns {Promise<any>}
     */
    ConfigurationSyncstatePage.prototype.updateCounts = function () {
        var self = this;
        return new Promise(function (resolve, reject) {
            var countPromises = [
                self.checkpointProvider.getRemoteDataCount(),
                self.checkpointProvider.getDatabaseDocumentCount(),
                self.checkpointProvider.getSyncableDataCountUp(),
                self.checkpointProvider.getSyncableDataCountDown(),
                self.checkinProvider.getRemoteDataCount(),
                self.checkinProvider.getDatabaseDocumentCount(),
                self.checkinProvider.getSyncableDataCountUp(),
                self.checkinProvider.getSyncableDataCountDown(),
            ];
            Promise.all(countPromises).then(function (data) {
                LogService.log("SYNC COUNT DATA" + JSON.stringify(data));
                //CHECKPOINTS
                self.counts.checkpoints.server = data[0];
                self.counts.checkpoints.device = data[1];
                self.counts.checkpoints.unsynced_up = data[2];
                self.counts.checkpoints.unsynced_down = data[3];
                //CHECKINS
                self.counts.checkins.server = data[4];
                self.counts.checkins.device = data[5];
                self.counts.checkins.unsynced_up = data[6];
                self.counts.checkins.unsynced_down = data[7];
                //TOTAL UNSYNCED COUNT
                self.counts.unsynced_count = self.counts.checkpoints.unsynced_up
                    + self.counts.checkpoints.unsynced_down
                    + self.counts.checkins.unsynced_up
                    + self.counts.checkins.unsynced_down;
                // IS IN SYNC
                self.is_in_sync = (self.counts.unsynced_count == 0)
                    && self.counts.checkpoints.server != 0
                    && self.counts.checkins.server != 0;
                self.completeFullCacheCleanAction();
                self.viewIsReady = true;
                resolve();
            }, function (e) {
                reject(e);
            });
        });
    };
    /**
     * Unlock Sync page and do other after full cache clear actions
     */
    ConfigurationSyncstatePage.prototype.completeFullCacheCleanAction = function () {
        if (this.backgroundService.isSyncPageLocked()) {
            if (this.counts.unsynced_count == 0) {
                LogService.log("FULL CACHE CLEAN COMPLETED.", LogService.LEVEL_WARN);
                this.backgroundService.setSyncIntervalNormal();
                this.backgroundService.unlockSyncPage();
                if (this.platform.is("mobile")) {
                    this.insomnia.allowSleepAgain().then(function () {
                        LogService.log("KEEP AWAKE OFF!");
                    });
                }
            }
        }
    };
    /**
     *
     */
    ConfigurationSyncstatePage.prototype.registerInterfaceRefreshRequest = function () {
        var _this = this;
        if (this.isInterfaceRefreshRunning) {
            //LogService.log('CFG[SS] - IRR already running - skipping.');
            this.hasInterfaceRefreshRequest = true;
            return;
        }
        /**
         * Recheck if we need to run the action again
         *
         * @param {ConfigurationSyncstatePage} self
         */
        var recheck = function (self) {
            self.isInterfaceRefreshRunning = false;
            if (self.hasInterfaceRefreshRequest) {
                self.hasInterfaceRefreshRequest = false;
                self.registerInterfaceRefreshRequest();
            }
        };
        this.isInterfaceRefreshRunning = true;
        this.updateCounts().then(function () {
            recheck(_this);
        }, function () {
            recheck(_this);
        });
    };
    /**
     *
     * @param {any} data
     */
    ConfigurationSyncstatePage.prototype.dbChangeSubscriberNextData = function (data) {
        if (_.includes(['checkpoint', 'checkin'], data.db)) {
            //LogService.log('CFG[SS]['+data.db+'] ID: ' + data.id);
            this.registerInterfaceRefreshRequest();
        }
    };
    ConfigurationSyncstatePage.prototype.subscribeToDataChange = function () {
        var _this = this;
        this.dataChangeSubscriptionCheckin = this.checkinProvider.databaseChangeObservable.subscribe(function (data) { return _this.dbChangeSubscriberNextData(data); });
        this.dataChangeSubscriptionCheckpoint = this.checkpointProvider.databaseChangeObservable.subscribe(function (data) { return _this.dbChangeSubscriberNextData(data); });
    };
    ConfigurationSyncstatePage.prototype.unsubscribeToDataChange = function () {
        if (this.dataChangeSubscriptionCheckin) {
            this.dataChangeSubscriptionCheckin.unsubscribe();
        }
        if (this.dataChangeSubscriptionCheckpoint) {
            this.dataChangeSubscriptionCheckpoint.unsubscribe();
        }
    };
    /**
     * Actions on component init
     */
    ConfigurationSyncstatePage.prototype.ngOnInit = function () {
        if (this.platform.is("mobile")) {
            this.insomnia.keepAwake();
        }
        if (this.backgroundService.applicationResetRequested) {
            this.handleApplicationResetRequest();
            return;
        }
        if (!this.userService.is_user_configured) {
            this.viewIsReady = false;
            this.viewNotReadyText = "Clicca sul pulsante 'Impostazioni' per configurare l'applicazione.";
            return;
        }
        this.registerInterfaceRefreshRequest();
        this.subscribeToDataChange();
    };
    /**
     * Actions on component destroy
     */
    ConfigurationSyncstatePage.prototype.ngOnDestroy = function () {
        if (this.platform.is("mobile")) {
            this.insomnia.allowSleepAgain();
        }
        this.unsubscribeToDataChange();
    };
    ConfigurationSyncstatePage = __decorate([
        Component({
            selector: 'page-configuration-syncstate',
            template: "\n    <ion-content *ngIf=\"viewIsReady\">\n\n      <h1 class=\"tab-title\">\n        Stato sincronizzazione\n      </h1>\n\n      <ion-list>\n\n        <ion-item class=\"sync-state\" text-center align-items-center>\n          <ion-icon *ngIf=\"is_in_sync\" name=\"happy\" class=\"happy\"></ion-icon>\n          <ion-icon *ngIf=\"!is_in_sync\" name=\"sad\" class=\"sad\"></ion-icon>\n        </ion-item>\n\n        <!--ADMIN ONLY-->\n        <div class=\"buttons cache-clean-buttons\" text-center align-items-center *ngIf=\"userService.isTrustedUser()\">\n          <button ion-button icon-left (click)=\"doSomething()\" color=\"dark\">\n            <ion-icon name=\"refresh-circle\"></ion-icon>\n            <ion-label>Sync one step</ion-label>\n          </button>\n\n          <button ion-button icon-left (click)=\"handleApplicationResetRequest()\" color=\"danger\">\n            <ion-icon name=\"ice-cream\"></ion-icon>\n            <ion-label>Reset application</ion-label>\n          </button>\n\n          <button ion-button icon-left (click)=\"backgroundService.start()\" color=\"light\">\n            <ion-icon name=\"clock\"></ion-icon>\n            <ion-label>Start Timer</ion-label>\n          </button>\n          <button ion-button icon-left (click)=\"backgroundService.stop()\" color=\"light\">\n            <ion-icon name=\"hand\"></ion-icon>\n            <ion-label>Stop Timer</ion-label>\n          </button>\n        </div>\n        <!--ADMIN ONLY-->\n\n        <ion-list-header>Locali</ion-list-header>\n\n        <ion-item>\n          <ion-icon item-start name=\"cloud\"></ion-icon>\n          Elementi sul server\n          <ion-badge item-end>{{counts.checkpoints.server}}</ion-badge>\n        </ion-item>\n\n        <ion-item>\n          <ion-icon item-start name=\"phone-portrait\"></ion-icon>\n          Elementi sul device\n          <ion-badge item-end>{{counts.checkpoints.device}}</ion-badge>\n        </ion-item>\n\n        <ion-item>\n          <ion-icon item-start name=\"flash\"></ion-icon>\n          Da sincronizzare[su/gi\u00F9]\n          <ion-badge item-end color=\"yellow-light\">{{counts.checkpoints.unsynced_up}}</ion-badge>\n          <ion-badge item-end color=\"violet-light\">{{counts.checkpoints.unsynced_down}}</ion-badge>\n        </ion-item>\n\n\n        <ion-list-header>Tracce</ion-list-header>\n\n        <ion-item>\n          <ion-icon item-start name=\"cloud\"></ion-icon>\n          Elementi sul server\n          <ion-badge item-end>{{counts.checkins.server}}</ion-badge>\n        </ion-item>\n\n        <ion-item>\n          <ion-icon item-start name=\"phone-portrait\"></ion-icon>\n          Elementi sul device\n          <ion-badge item-end>{{counts.checkins.device}}</ion-badge>\n        </ion-item>\n\n        <ion-item>\n          <ion-icon item-start name=\"flash\"></ion-icon>\n          Da sincronizzare[su/gi\u00F9]\n          <ion-badge item-end color=\"yellow-light\">{{counts.checkins.unsynced_up}}</ion-badge>\n          <ion-badge item-end color=\"violet-light\">{{counts.checkins.unsynced_down}}</ion-badge>\n        </ion-item>\n\n      </ion-list>\n\n    </ion-content>\n\n    <ion-content *ngIf=\"!viewIsReady\">\n      <h1 class=\"loading\">{{viewNotReadyText}}</h1>\n    </ion-content>\n  "
        }),
        __metadata("design:paramtypes", [ToastController,
            Platform,
            Insomnia,
            CheckpointProvider,
            CheckinProvider,
            OfflineCapableRestService,
            BackgroundService,
            RemoteDataService,
            UserService])
    ], ConfigurationSyncstatePage);
    return ConfigurationSyncstatePage;
}());
export { ConfigurationSyncstatePage };
//# sourceMappingURL=configuration.syncstate.js.map