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
/* SERVICES */
import { BackgroundService } from "../../../services/background.service";
/* PAGES */
import { ConfigurationSyncstatePage } from '../configuration.syncstate/configuration.syncstate';
import { ConfigurationSettingsPage } from '../configuration.settings/configuration.settings';
/* OTHER */
var ConfigurationPage = /** @class */ (function () {
    function ConfigurationPage(backgroundService) {
        this.backgroundService = backgroundService;
        this.tab1 = ConfigurationSyncstatePage;
        this.tab2 = ConfigurationSettingsPage;
    }
    /**
     * @returns {boolean}
     */
    ConfigurationPage.prototype.isLocked = function () {
        return this.backgroundService.isSyncPageLocked();
    };
    ConfigurationPage = __decorate([
        Component({
            selector: 'page-configuration',
            template: "\n    <ion-header>\n      <ion-navbar>\n        <button ion-button *ngIf=\"!isLocked()\" menuToggle>\n          <ion-icon name=\"menu\"></ion-icon>\n        </button>\n        <ion-title float-left>Configurazione</ion-title>\n      </ion-navbar>\n    </ion-header>\n\n    <ion-tabs>\n      <ion-tab tabIcon=\"sync\" tabTitle=\"Sincronizzazione\" [root]=\"tab1\"></ion-tab>\n      <ion-tab tabIcon=\"switch\" enabled=\"{{!isLocked()}}\" tabTitle=\"Impostazioni\" [root]=\"tab2\"></ion-tab>\n    </ion-tabs>\n  "
        }),
        __metadata("design:paramtypes", [BackgroundService])
    ], ConfigurationPage);
    return ConfigurationPage;
}());
export { ConfigurationPage };
//# sourceMappingURL=configuration.js.map