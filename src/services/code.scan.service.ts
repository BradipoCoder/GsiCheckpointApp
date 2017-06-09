/**
 * Created by jack on 05/06/17.
 */
import {Injectable} from '@angular/core';
import {Platform} from "ionic-angular";
import {RemoteDataService} from './remote.data.service';
import {UserService} from './user.service';
import {BarcodeScanner} from '@ionic-native/barcode-scanner';
import _ from "lodash";

@Injectable()
export class CodeScanService
{
  private isMobileDevice:boolean;

  constructor(private barcodeScanner:BarcodeScanner
  , private platform:Platform )
  {
    this.isMobileDevice = !this.platform.is("core");
  }

  /**
   *
   *
   * @param {any} options
   * @returns {Promise<any>}
   */
  scanQR(options={}):Promise<any>
  {
    let self = this;
    return new Promise(function (resolve, reject)
    {
      self.scan(options).then((barcodeData) => {
        if(barcodeData.format != 'QR_CODE')
        {
          reject(new Error("The scanned image is not a QR Code!"));
        }

        resolve(barcodeData);
      }, (e) => {
        reject(e);
      });
    });
  }

  /**
   *
   * @param {any} options
   * @returns {Promise<any>}
   */
  scan(options={}):Promise<any>
  {
    let self = this;
    let expected = _.has(options, "expect") ? _.get(options, "expect") : "";

    return new Promise(function (resolve, reject)
    {


      if(self.isMobileDevice)
      {
        self.barcodeScanner.scan(options).then((barcodeData) => {
          if(!_.isEmpty(expected) && expected != barcodeData.text)
          {
            reject(new Error("The scanned QR Code is different from what was expected("+expected+")!"));
          }
          resolve(barcodeData);
        }, (e) => {
          reject(e);
        });
      } else {
        console.log("Not a mobile environment - faking scan["+expected+"]...");
        let barcodeData = self.getFakeQRCode(expected);
        if(!_.isEmpty(expected) && expected != barcodeData.text)
        {
          reject(new Error("The scanned QR Code is different from what was expected("+expected+")!"));
        }
        resolve(barcodeData);
      }
    });
  }

  /**
   *
   * @param {any} code
   * @returns {{format: string, cancelled: boolean, text: string}}
   */
  getFakeQRCode(code:any = ""):any
  {
    let codes = ["GSI-IN", "GSI-OUT", "B35", "C20", "F41", "T40"];
    code = _.includes(codes, code) ? code :  _.sample(codes);
    return {
      format: 'QR_CODE',
      cancelled: false,
      text: code
    }
  }
}
