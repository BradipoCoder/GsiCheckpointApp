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
   * @todo: all the 'expected' thing should be based on TYPE and not CODE as it is now!!!
   * now passing: {expected_type:expectedType}
   *
   * @param {any} options
   * @returns {Promise<any>}
   */
  scan(options={}):Promise<any>
  {
    let self = this;
    let expected_type:string = _.has(options, "expected_type")
      ? _.get(options, "expected_type").toString()
      : RemoteDataService.CHECKPOINT_TYPE_CHK;

    return new Promise(function (resolve, reject)
    {
      if(self.isMobileDevice)
      {
        self.barcodeScanner.scan(options).then((barcodeData) => {
          //@todo: need to check with remoteDataServices
          /*
          if(!_.isEmpty(expected) && !_.includes(expected, barcodeData.text))
          {
            reject(new Error("The scanned QR Code is different from what was expected("+JSON.stringify(expected)+")!"));
          }*/

          resolve(barcodeData);
        }, (e) => {
          reject(e);
        });
      } else {
        let barcodeData = self.getFakeQRCode(expected_type);
        //@todo: need to check with remoteDataServices
        /*
        if(!_.isEmpty(expected) && !_.includes(expected, barcodeData.text))
        {
          reject(new Error("The scanned QR Code is different from what was expected("+JSON.stringify(expected)+")!"));
        }
        */
        resolve(barcodeData);
      }
    });
  }

  /**
   *
   * @param {string} expected_type
   * @returns {{format: string, cancelled: boolean, text: string}}
   */
  getFakeQRCode(expected_type:string):any
  {
    let allowFakes = [];
    switch (expected_type)
    {
      case RemoteDataService.CHECKPOINT_TYPE_IN:
        allowFakes = ["MKT-IN"];
        break;
      case RemoteDataService.CHECKPOINT_TYPE_OUT:
        allowFakes = ["MKT-OUT"];
        break;
      case RemoteDataService.CHECKPOINT_TYPE_CHK:
        allowFakes = ["B35", "C20", "F41", "T40"];
        break;
    }

    console.log("Not a mobile environment - faking scan with expected type: "+JSON.stringify(allowFakes)+"...");

    let codes = ["MKT-IN", "MKT-OUT", "B35", "C20", "F41", "T40"];
    let allowed = !_.isEmpty(allowFakes) ? _.intersection(codes, allowFakes) : codes;
    let code = _.sample(allowed);
    return {
      format: 'QR_CODE',
      cancelled: false,
      text: code
    }
  }
}

