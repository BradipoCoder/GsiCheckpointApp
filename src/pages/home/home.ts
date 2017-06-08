import {Component} from '@angular/core';
import {NavController} from 'ionic-angular';
import {UserService} from '../../services/user.service';
import { BarcodeScanner } from '@ionic-native/barcode-scanner';

import {LoginPage} from "../login/login";

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage
{
  private lastScannedBarcode:string;

  constructor(public navCtrl: NavController
    , private userService: UserService
    , private barcodeScanner:BarcodeScanner)
  {

  }

  scanQR():void
  {
    console.log("launching QR CODE reader...");

    this.barcodeScanner.scan().then((barcodeData) =>
    {
      this.lastScannedBarcode = JSON.stringify(barcodeData);
      console.error("Barcode data: " + this.lastScannedBarcode);

    }, (e) => {
      console.error("Error scanning barcode: " + e);
    });
  }

  /**
   *
   * @param {string} key
   * @returns {string}
   */
  getUserData(key:string):any
  {
    return this.userService.getUserData(key);
  }

  /**
   *
   * @returns {boolean}
   */
  isUserAuthenticated(): boolean
  {
    return this.userService.isAuthenticated();
  }
}
