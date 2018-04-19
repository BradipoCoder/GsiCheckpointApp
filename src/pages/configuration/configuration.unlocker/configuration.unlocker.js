var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
/**
 * Created by jack on 05/06/17.
 */
import { Component } from '@angular/core';
import { IonicPage, ViewController } from 'ionic-angular';
var ConfigurationUnlockerPage = /** @class */ (function () {
    function ConfigurationUnlockerPage(viewCtrl) {
        this.viewCtrl = viewCtrl;
        /**
         * This is to auto-fill-in unlock code.
         * Clear this in production releases
         * The real unlock code is here:
         * @see: src/services/configuration.service.ts:24
         *
         *
         * @type {string}
         */
        this.unlock_code = "MKT"; //@fixme: remote value!
    }
    ConfigurationUnlockerPage.prototype.dismiss = function () {
        this.viewCtrl.dismiss({ unlock_code: this.unlock_code });
    };
    ConfigurationUnlockerPage.prototype.cancel = function () {
        this.viewCtrl.dismiss({});
    };
    ConfigurationUnlockerPage = __decorate([
        IonicPage(),
        Component({
            selector: 'page-configuration-unlocker',
            template: "\n    <ion-header>\n      <ion-toolbar>\n        <ion-title>\n          Codice sblocco\n        </ion-title>\n        <ion-buttons start>\n          <button ion-button (click)=\"dismiss()\">\n            <ion-icon name=\"md-close\"></ion-icon>\n          </button>\n        </ion-buttons>\n      </ion-toolbar>\n    </ion-header>\n\n    <ion-content>\n      <ion-item>\n        <p>\n          Per modificare le configurazioni \u00E8 necessario inserire il codice di sblocco.\n        </p>\n      </ion-item>\n      <ion-item>\n        <ion-label stacked>Codice sblocco</ion-label>\n        <ion-input [(ngModel)]=\"unlock_code\"></ion-input>\n      </ion-item>\n      <ion-item>\n        <ion-buttons>\n          <button ion-button color=\"primary\" icon-left (click)=\"dismiss()\">\n            <ion-icon name=\"checkmark-circle\"></ion-icon>\n            OK\n          </button>\n          <button ion-button color=\"danger\" icon-right (click)=\"cancel()\">\n            Annulla\n            <ion-icon name=\"close-circle\"></ion-icon>\n          </button>\n        </ion-buttons>\n      </ion-item>\n    </ion-content>\n  "
        }),
        __metadata("design:paramtypes", [ViewController])
    ], ConfigurationUnlockerPage);
    return ConfigurationUnlockerPage;
}());
export { ConfigurationUnlockerPage };
//# sourceMappingURL=configuration.unlocker.js.map