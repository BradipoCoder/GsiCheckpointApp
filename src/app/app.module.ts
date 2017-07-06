import {BrowserModule} from "@angular/platform-browser";
import {ErrorHandler, NgModule} from "@angular/core";
import {FormsModule} from '@angular/forms';
import {IonicApp, IonicErrorHandler, IonicModule} from "ionic-angular";
import {MekitTracerApp} from "./app.component";

/* Ionic */
import {StatusBar} from "@ionic-native/status-bar";
import {SplashScreen} from "@ionic-native/splash-screen";
import {BarcodeScanner} from '@ionic-native/barcode-scanner';
import {Network} from '@ionic-native/network';

/* Services */
import {ConfigurationService} from '../services/configuration.service';
import {OfflineCapableRestService} from '../services/offline.capable.rest.service';
import {UserService} from '../services/user.service';
import {RemoteDataService} from '../services/remote.data.service';
import {CodeScanService} from '../services/code.scan.service';

/* Providers */
import {CheckpointProvider} from '../providers/checkpoint.provider';
import {CheckinProvider} from '../providers/checkin.provider';

/* Pages */
import {HomePage} from "../pages/home/home";
import {InfoPage} from "../pages/info/info";
import {LogoutPage} from "../pages/logout/logout";
import {ConfigurationPage} from "../pages/configuration/configuration";
import {ConfigurationUnlockerPage} from "../pages/configuration/configuration.unlocker";

/* Other/Utils/Tools */

@NgModule({
  declarations: [
    MekitTracerApp
    , HomePage
    , InfoPage
    , LogoutPage
    , ConfigurationPage
    , ConfigurationUnlockerPage
  ],
  imports: [
    BrowserModule
    , FormsModule
    , IonicModule.forRoot(MekitTracerApp)
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MekitTracerApp
    , HomePage
    , InfoPage
    , LogoutPage
    , ConfigurationPage
    , ConfigurationUnlockerPage
  ],
  providers: [
    StatusBar
    , SplashScreen
    , BarcodeScanner
    , ConfigurationService
    , OfflineCapableRestService
    , UserService
    , RemoteDataService
    , CodeScanService
    , Network
    , CheckpointProvider
    , CheckinProvider
    , {provide: ErrorHandler, useClass: IonicErrorHandler}
  ]
})
export class AppModule
{

  constructor(public userService: UserService)
  {
  }
}

