import {Component, OnInit} from '@angular/core';
import {NavController, ToastController} from 'ionic-angular';
import {UserService} from '../../services/user.service';
import {RemoteDataService} from '../../services/remote.data.service';
import {CodeScanService} from '../../services/code.scan.service';


@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage  implements OnInit
{
  private lastScannedBarcode:string;

  constructor(public navCtrl: NavController
    , public toastCtrl: ToastController
    , private userService: UserService
    , private codeScanService: CodeScanService
    , private remoteDataService: RemoteDataService
    )
  {
    console.log("HOME constructed!");

  }

  /**
   *
   * @param {string} expectedType
   */
  scanQRCode(expectedType:string):void
  {
    this.codeScanService.scanQR({expected_type:expectedType}).then((barcodeData) =>
    {
      this.lastScannedBarcode = JSON.stringify(barcodeData);
      this.remoteDataService.storeNewCheckin(barcodeData.text);


    }, (e) => {
      console.error("Error scanning barcode: " + e);
      let toast = this.toastCtrl.create({
        message: e,
        duration: 3000,
        position: 'top'
      });
      toast.present();
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

  /**
   *
   * @returns {boolean}
   */
  isConnected(): boolean
  {
    return this.remoteDataService.isNetworkConnected();
  }

  /**
   *
   * @returns {boolean}
   */
  isUserCheckedIn(): boolean
  {
    return this.remoteDataService.getLastOperationType() == RemoteDataService.CHECKPOINT_TYPE_IN;
  }

  ngOnInit():void
  {
    //

  }
}
