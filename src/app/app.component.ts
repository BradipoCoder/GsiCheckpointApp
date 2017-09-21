import {Component, ViewChild} from "@angular/core";
import {Nav, Platform} from "ionic-angular";
import {StatusBar} from "@ionic-native/status-bar";
import {SplashScreen} from "@ionic-native/splash-screen";

import {ConfigurationService} from '../services/configuration.service';
import {UserService} from '../services/user.service';
import {RemoteDataService} from '../services/remote.data.service';

import {HomePage} from "../pages/home/home";
import {ConfigurationPage} from "../pages/configuration/configuration";
import {LogoutPage} from "../pages/logout/logout";
import {CheckpointsPage} from "../pages/checkpoints/checkpoints";

//import _ from "lodash";

@Component({
  templateUrl: 'app.html'
})
export class MekitTracerApp
{
  @ViewChild(Nav) nav: Nav;
  /* The page to start with */
  startupPage: any = CheckpointsPage;
  rootPage: any;
  pages: Array<{ title: string, icon: string, component: any }>;

  constructor(public platform: Platform
    , public statusBar: StatusBar
    , public splashScreen: SplashScreen
    , private configurationService: ConfigurationService
    , private userService: UserService
    , private remoteDataService: RemoteDataService)
  {

    // Main menu items
    this.pages = [
      {title: 'Home', icon: 'home', component: HomePage},
      {title: 'Configurazione', icon: 'hammer', component: ConfigurationPage},
      {title: 'Locali', icon: 'globe', component: CheckpointsPage},
      {title: 'Esci', icon: 'power', component: LogoutPage}
    ];

    this.initializeApp();
  }

  initializeApp()
  {
    this.platform.ready().then(() =>
    {
      // Okay, so the platform is ready and our plugins are available.
      console.log("Platform is ready. Let's go!");
      return this.configurationService.initialize();
    }).then(() =>
    {
      console.log("Configuration service initialized.");
      return this.userService.initialize();
    }).then(() =>
    {
      console.log("User service initialized.");
      return this.remoteDataService.initialize(false, true);//do NOT load data
    }).then(() =>
    {
      console.log("RemoteData service initialized.");
      this.presentStartupPage();
    }).catch((e) =>
    {
      console.error("App initialization error: " + e);
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
    this.nav.setRoot(page.component);
  }
}

