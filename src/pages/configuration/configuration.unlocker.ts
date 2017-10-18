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
  unlock_code:string = "MKT";

  constructor(public viewCtrl: ViewController)
  {}

  dismiss() {
    let data = { unlock_code: this.unlock_code };
    this.viewCtrl.dismiss(data);
  }
}
