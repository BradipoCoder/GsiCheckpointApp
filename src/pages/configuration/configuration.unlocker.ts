/**
 * Created by jack on 05/06/17.
 */
import {Component} from '@angular/core';
import {ViewController} from 'ionic-angular';

@Component({
  selector: 'page-configuration-unlocker',
  templateUrl: 'configuration.unlocker.html'
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
  unlock_code:string = "MKT";

  constructor(public viewCtrl: ViewController)
  {}

  dismiss() {
    let data = { unlock_code: this.unlock_code };
    this.viewCtrl.dismiss(data);
  }
}
