import {Component, ViewChild} from "@angular/core";
import {Nav, Platform} from "ionic-angular";
import {StatusBar} from "@ionic-native/status-bar";
import {SplashScreen} from "@ionic-native/splash-screen";

import {HomePage} from "../pages/home/home";
import {ConfigurationPage} from "../pages/configuration/configuration";
import {InfoPage} from "../pages/info/info";
import {LogoutPage} from "../pages/logout/logout";


import {ConfigurationService} from '../services/configuration.service';

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
  )
  {

    // Main menu items
    this.pages = [
      {title: 'Home', icon: 'home', component: HomePage},
      {title: 'Configuration', icon: 'hammer', component: ConfigurationPage},
      {title: 'Info', icon: 'information-circle', component: InfoPage},
      {title: 'Logout', icon: 'exit', component: LogoutPage}
    ];

    //init services before starting the app
    this.configurationService.setUp().then(() => {

      this.initializeApp();

    }).catch((e) => {
      console.log("Setup error: " + e);
    });


  }

  initializeApp()
  {
    this.platform.ready().then(() =>
    {
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      this.statusBar.styleDefault();
      this.splashScreen.hide();
    });
  }

  openPage(page)
  {
    // Reset the content nav to have just this page
    // we wouldn't want the back button to show in this scenario
    this.nav.setRoot(page.component);
  }
}
