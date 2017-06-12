/**
 * Created by jack on 05/06/17.
 */
import {Injectable} from '@angular/core';
import {Platform} from "ionic-angular";
import {RemoteDataService} from './remote.data.service';
import {UserService} from './user.service';
import {BarcodeScanner} from '@ionic-native/barcode-scanner';
import _ from "lodash";
import {isEmpty} from "rxjs/operator/isEmpty";

@Injectable()
export class CodeScanService
{
  public static readonly BARCODE_TYPE_QR : string    = "QR_CODE";

  private isMobileDevice:boolean;

  constructor(private barcodeScanner:BarcodeScanner
  , private platform:Platform
  , private remoteDataService:RemoteDataService )
  {
    this.isMobileDevice = !this.platform.is("core");
  }

  /**
   *
   *
   * @param {any} options
   * @returns {Promise<any>}
   */
  public scanQR(options={}):Promise<any>
  {
    let self = this;
    return new Promise(function (resolve, reject)
    {
      self.scan(options).then((barcodeData) => {
        if(barcodeData.format != CodeScanService.BARCODE_TYPE_QR)
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
   * now passing: {expected_type:expectedType}
   *
   * @param {any} options
   * @returns {Promise<any>}
   */
  public scan(options={}):Promise<any>
  {
    let self = this;

    return new Promise(function (resolve, reject)
    {
      if(self.isMobileDevice)
      {
        self.barcodeScanner.scan(options).then((barcodeData) => {
          try {
            self.scanCheck(barcodeData, options);
            resolve(barcodeData);
          } catch(e)
          {
            reject(e);
          }
        }, (e) => {
          reject(e);
        });
      } else {
        let barcodeData = self.getFakeQRCode(options);
        try {
          self.scanCheck(barcodeData, options);
          resolve(barcodeData);
        } catch(e)
        {
          reject(e);
        }
      }
    });
  }

  /**
   * @todo:  remoteDataService related checks shoul be moved in storeNewCheckin method
   *
   * @param {any} barcodeData
   * @param {any} options
   * @throws Error
   */
  private scanCheck(barcodeData:any, options:any): void
  {
    let expected_type:string = _.has(options, "expected_type")
      ? _.get(options, "expected_type").toString()
      : "";

    // expected_type must be defined
    if(_.isEmpty(expected_type))
    {
      throw new Error("Expected type is undefined!");
    }

    // Barcode sanity check
    if(_.isEmpty(barcodeData) || _.isUndefined(barcodeData.text) || _.isEmpty(barcodeData.text))
    {
      throw new Error("Codice scansionato non valido: " + JSON.stringify(barcodeData.text));
    }

    // Find a matching checkpoint
    let checkpoint = this.remoteDataService.getCheckpoint({code: barcodeData.text});
    if(_.isUndefined(checkpoint))
    {
      throw new Error("Nessun ambiente corrispondente per il codice scansionato: " + barcodeData.text);
    }
    //console.log("MATCHING CP: " + JSON.stringify(checkpoint));

    // Expected type check
    if(checkpoint.type != expected_type)
    {
      throw new Error("Il codice scansionato("+barcodeData.text+") non è del tipo atteso: " + expected_type);
    }
  }

  /**
   *
   * @param {any} options
   * @returns {{format: string, cancelled: boolean, text: string}}
   */
  getFakeQRCode(options:any):any
  {
    let expected_type:string = _.has(options, "expected_type")
      ? _.get(options, "expected_type").toString()
      : RemoteDataService.CHECKPOINT_TYPE_CHK;

    //let codes = ["MKT-IN", "MKT-OUT", "B35", "C20", "F41", "T40"];
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

    let code = _.sample(allowFakes);
    console.log("Not mobile - faking("+expected_type+"): "+JSON.stringify(allowFakes)+"...: " + code);

    return {
      format: CodeScanService.BARCODE_TYPE_QR,
      cancelled: false,
      text: code
    }
  }
}

