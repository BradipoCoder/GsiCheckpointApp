import {Component, ViewChild} from "@angular/core";
import {Nav, Platform} from "ionic-angular";
import {StatusBar} from "@ionic-native/status-bar";
import {SplashScreen} from "@ionic-native/splash-screen";

import {HomePage} from "../pages/home/home";
import {ConfigurationPage} from "../pages/configuration/configuration";
import {InfoPage} from "../pages/info/info";
import {LogoutPage} from "../pages/logout/logout";


import {ConfigurationService} from '../services/configuration.service';
import {UserService} from '../services/user.service';

//import _ from "lodash";

@Component({
  templateUrl: 'app.html'
})
export class MyApp
{
  @ViewChild(Nav) nav: Nav;


  rootPage: any = HomePage;


  pages: Array<{ title: string, icon: string, component: any }>;

  constructor(
    public platform: Platform
    , public statusBar: StatusBar
    , public splashScreen: SplashScreen
    , private configurationService: ConfigurationService
    , private userService: UserService
  )
  {

    // Main menu items
    this.pages = [
      {title: 'Home', icon: 'home', component: HomePage},
      {title: 'Configuration', icon: 'hammer', component: ConfigurationPage},
      {title: 'Info', icon: 'information-circle', component: InfoPage},
      {title: 'Logout', icon: 'exit', component: LogoutPage}
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
    }).then(() => {
        console.log("Configuration service initialized.");
        return this.userService.initialize();
    }).then(() => {
      console.log("User service initialized.");

      if(!this.platform.is("core")){
        this.statusBar.styleDefault();
        this.splashScreen.hide();
      }
    }).catch((e) => {
      console.log("App initialization error: " + e);
    });
  }

  openPage(page)
  {
    // Reset the content nav to have just this page
    // we wouldn't want the back button to show in this scenario
    this.nav.setRoot(page.component);
  }
}

