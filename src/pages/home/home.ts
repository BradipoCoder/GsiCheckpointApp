import {Component} from '@angular/core';
import {NavController} from 'ionic-angular';
import {UserService} from '../../services/user.service';
import {RemoteDataService} from '../../services/remote.data.service';
import {CodeScanService} from '../../services/code.scan.service';


@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage
{
  private lastScannedBarcode:string;

  constructor(public navCtrl: NavController
    , private userService: UserService
    , private codeScanService: CodeScanService
    , public remoteDataService: RemoteDataService
    )
  {
    console.log("HOME constructed!");
  }

  scanQR():void
  {
    console.log("launching QR CODE reader...");

    this.codeScanService.scanQR({expect:'GSI-IN'}).then((barcodeData) =>
    {
      this.lastScannedBarcode = JSON.stringify(barcodeData);

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
