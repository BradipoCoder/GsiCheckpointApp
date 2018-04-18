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
import {Insomnia} from '@ionic-native/insomnia';
/* Services */
import {ConfigurationService} from '../services/configuration.service';
import {LogService} from "../services/log.service";
import {OfflineCapableRestService} from '../services/offline.capable.rest.service';
import {UserService} from '../services/user.service';
import {RemoteDataService} from '../services/remote.data.service';
import {BackgroundService} from '../services/background.service';
import {CodeScanService} from '../services/code.scan.service';
/* Providers */
import {CheckpointProvider} from '../providers/checkpoint.provider';
import {CheckinProvider} from '../providers/checkin.provider';
import {TaskProvider} from "../providers/task.provider";
/* Pages */
import {InfoPage} from "../pages/info/info";
import {TasksPage} from "../pages/tasks/tasks";
import {TaskNewPage} from "../pages/tasks/task.new";
import {TasksInPage} from "../pages/tasks/tasks.in";
import {TasksOutPage} from "../pages/tasks/tasks.out";

/* Other/Utils/Tools */

@NgModule({
  declarations: [
    MekitTracerApp
    , InfoPage
    , TasksPage
    , TaskNewPage
    , TasksInPage
    , TasksOutPage
  ],
  entryComponents: [
    MekitTracerApp
    , InfoPage
    , TasksPage
    , TaskNewPage
    , TasksInPage
    , TasksOutPage
  ],
  providers: [
    StatusBar
    , BackgroundService
    , BarcodeScanner
    , CheckinProvider
    , CheckpointProvider
    , TaskProvider
    , CodeScanService
    , ConfigurationService
    , Insomnia
    , LogService
    , Network
    , OfflineCapableRestService
    , RemoteDataService
    , SplashScreen
    , UserService
    , {provide: ErrorHandler, useClass: IonicErrorHandler}
  ],
  imports: [
    BrowserModule
    , FormsModule
    , IonicModule.forRoot(MekitTracerApp)
  ],
  bootstrap: [IonicApp],
})
export class AppModule
{

  constructor(public userService: UserService)
  {
  }
}

