import {Component, ViewChild} from "@angular/core";
import {Nav, Platform} from "ionic-angular";
import {StatusBar} from "@ionic-native/status-bar";
import {SplashScreen} from "@ionic-native/splash-screen";

import {ConfigurationService} from '../services/configuration.service';
import {LogService} from "../services/log.service";
import {UserService} from '../services/user.service';
import {RemoteDataService} from '../services/remote.data.service';
import {BackgroundService} from '../services/background.service';

import {HomePage} from "../pages/home/home";
import {ConfigurationPage} from "../pages/configuration/configuration";
import {CheckpointsPage} from "../pages/checkpoints/checkpoints";
import {CheckinsPage} from "../pages/checkins/checkins";


@Component({
  templateUrl: 'app.html'
})
export class MekitTracerApp
{
  @ViewChild(Nav) nav: Nav;
  /* The page to start with */
  startupPage: any = HomePage;//ConfigurationPage
  rootPage: any;
  pages: Array<{ title: string, icon: string, component: any }>;

  constructor(public platform: Platform
    , public statusBar: StatusBar
    , public splashScreen: SplashScreen
    , private configurationService: ConfigurationService
    , private logService: LogService
    , private userService: UserService
    , private backgroundService: BackgroundService
    , private remoteDataService: RemoteDataService)
  {

    // Main menu items
    this.pages = [
      {title: 'Home', icon: 'home', component: HomePage}
      , {title: 'Configurazione', icon: 'hammer', component: ConfigurationPage}
      , {title: 'Locali', icon: 'globe', component: CheckpointsPage}
      , {title: 'Tracciature', icon: 'flag', component: CheckinsPage}
      /*, {title: 'Esci', icon: 'power', component: LogoutPage}*/
    ];

    this.initializeApp();
  }

  initializeApp()
  {
    this.platform.ready().then(() => {
      // Okay, so the platform is ready and our plugins are available.
      LogService.log("Platform is ready. Let's go!");
      return this.configurationService.initialize();
    }).then(() => {
      LogService.log("Configuration service initialized.");
      return this.logService.initialize();
    }).then(() => {
      LogService.log("Log service initialized.");
      return this.userService.initialize();
    }).then(() => {
      LogService.log("User service initialized.");
      return this.remoteDataService.initialize();//do NOT load data
    }).then(() => {
      LogService.log("RemoteData service initialized.");
      return this.backgroundService.initialize();
    }).then(() => {
      LogService.log("BackgroundService service initialized.");
      this.presentStartupPage();
    }).catch((e) => {
      LogService.log("App initialization error: " + e, LogService.LEVEL_ERROR);
    });
  }

  presentStartupPage(): void
  {
    if (!this.platform.is("core"))
    {
      this.statusBar.styleDefault();
      this.splashScreen.hide();
    }
    /*-----------------------------------------*/
    /*------------START ROOT COMPONENT---------*/
    this.rootPage = this.startupPage;
    /*-----------------------------------------*/
  }

  /**
   * Used by main menu items
   * Reset the content nav to have just this page - so we don't have the back button
   *
   * @param page
   */
  openPage(page)
  {
    this.nav.setRoot(page.component).then(() => {
        //root is set
      }
    );
  }
}

