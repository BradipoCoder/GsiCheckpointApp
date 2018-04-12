/**
 * Created by jack on 05/06/17.
 */
import {Injectable} from '@angular/core';
import {Platform} from "ionic-angular";
import {RemoteDataService} from './remote.data.service';
import {BarcodeScanner} from '@ionic-native/barcode-scanner';

import {Checkpoint} from '../models/Checkpoint';


import _ from "lodash";
import {createSkipSelf} from "@angular/compiler/src/core";


@Injectable()
export class CodeScanService
{
  public static readonly BARCODE_TYPE_QR : string    = "QR_CODE";

  private isMobileDevice:boolean;

  private _isCodeScanInProgress:boolean = false;

  private _scannedCodeToRegister:string = null;

  /**
   * Constructor
   */
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
   * @returns {Promise<string>}
   */
  public scanQR(options={}):Promise<string>
  {
    let self = this;
    return new Promise(function (resolve, reject)
    {
      if(!self.isCodeScanInProgress())
      {
        self.setCodeScanInProgress(true);
        self.scan(options).then((barcodeData) => {
          if(barcodeData.format != CodeScanService.BARCODE_TYPE_QR)
          {
            self.setCodeScanInProgress(false);
            reject(new Error("The scanned image is not a QR Code!"));
          }
          self._scannedCodeToRegister = barcodeData.text;
          resolve(barcodeData.text);
        }, (e) => {
          self.setCodeScanInProgress(false);
          reject(e);
        });
      } else
      {
        //@todo: should we reset?
        //self.setCodeScanInProgress(false);
        reject(new Error("Code scan is already in progress!"));
      }
    });
  }

  /**
   *
   * now passing: {allowed_types:[]}
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
   * @param {any} barcodeData
   * @param {any} options
   * @throws Error
   */
  private scanCheck(barcodeData:any, options:any): void
  {
    let allowed_types:any = _.has(options, "allowed_types")
      ? _.get(options, "allowed_types") as any
      : [];

    // expected_type must be defined
    if(_.isEmpty(allowed_types))
    {
      throw new Error("Scan check: Allowed types are not defined!");
    }

    // Barcode sanity check
    if(_.isEmpty(barcodeData) || _.isUndefined(barcodeData.text) || _.isEmpty(barcodeData.text))
    {
      throw new Error("Codice scansionato non valido: " + JSON.stringify(barcodeData));
    }
  }

  /**
   * If allowed_types contains more than one type the FIRST type will be used
   *
   * @param {any} options
   * @returns {{format: string, cancelled: boolean, text: string}}
   */
  private getFakeQRCode(options:any):any
  {
    let allowed_types:any = _.has(options, "allowed_types")
      ? _.get(options, "allowed_types") as any
      : [Checkpoint.TYPE_CHK];
    let expected_type = _.first(allowed_types) as string;

    let codes:any = [];
    codes[Checkpoint.TYPE_IN] = ["CSI-IN"];
    codes[Checkpoint.TYPE_OUT] = ["CSI-OUT"];
    codes[Checkpoint.TYPE_CHK] = ["108", "142", "211", "274", "AT03", "ES12"];
    //codes[Checkpoint.TYPE_CHK] = ["124", "248", "A158", "AT76", "S103"];
    //codes[Checkpoint.TYPE_CHK] = ["AT88"];//"AT76",

    let allowFakes = codes[expected_type];

    /*
     * unallow the same codes to be returned twice in a row
     */
    try {
      let lastCheckinOperation = this.remoteDataService.getLastOperation();
      if(lastCheckinOperation.type == Checkpoint.TYPE_CHK && !_.isEmpty(lastCheckinOperation.code))
      {
        allowFakes = _.pull(allowFakes, lastCheckinOperation.code);
        if(!_.size(allowFakes))
        {
          allowFakes = codes[expected_type];
        }
      }
    } catch(e) {
      //all of them
    }

    let code = _.sample(allowFakes);
    //console.log("Not mobile - faking("+expected_type+"): "+JSON.stringify(allowFakes)+"...: " + code);

    return {
      format: CodeScanService.BARCODE_TYPE_QR,
      cancelled: false,
      text: code
    }
  }

  /**
   *
   * @returns {string}
   */
  public getScannedCodeToRegister()
  {
    return this._scannedCodeToRegister;
  }

  public isCodeScanInProgress(): boolean
  {
    return this._isCodeScanInProgress;
  }

  /**
   * @param {boolean} value
   */
  public setCodeScanInProgress(value: boolean)
  {
    if(value === true)
    {
      this._scannedCodeToRegister = null;
    }
    this._isCodeScanInProgress = value;
  }
}

