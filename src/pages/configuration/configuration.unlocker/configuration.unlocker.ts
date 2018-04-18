/**
 * Created by jack on 05/06/17.
 */
import {Component} from '@angular/core';
import {ViewController} from 'ionic-angular';

@Component({
  selector: 'page-configuration-unlocker',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>
          Codice sblocco
        </ion-title>
        <ion-buttons start>
          <button ion-button (click)="dismiss()">
            <ion-icon name="md-close"></ion-icon>
          </button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-item>
        <p>
          Per modificare le configurazioni è necessario inserire il codice di sblocco.
        </p>
      </ion-item>
      <ion-item>
        <ion-label stacked>Codice sblocco</ion-label>
        <ion-input [(ngModel)]="unlock_code"></ion-input>
      </ion-item>
      <ion-item>
        <ion-buttons>
          <button ion-button color="primary" icon-left (click)="dismiss()">
            <ion-icon name="checkmark-circle"></ion-icon>
            OK
          </button>
          <button ion-button color="danger" icon-right (click)="cancel()">
            Annulla
            <ion-icon name="close-circle"></ion-icon>
          </button>
        </ion-buttons>
      </ion-item>
    </ion-content>
  `
})
export class ConfigurationUnlockerPage
{
  /**
   * This is to auto-fill-in unlock code.
   * Clear this in production releases
   * The real unlock code is here:
   * @see: src/services/configuration.service.ts:24
   *
   *
   * @type {string}
   */
  unlock_code:string = "MKT";//@fixme: remote value!

  constructor(public viewCtrl: ViewController)
  {}

  protected dismiss():void {
    this.viewCtrl.dismiss({unlock_code: this.unlock_code });
  }

  protected cancel() {
    this.viewCtrl.dismiss({});
  }
}
