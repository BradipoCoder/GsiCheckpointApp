import {Component, ViewChild} from "@angular/core";
import {Nav, Platform} from "ionic-angular";
import {StatusBar} from "@ionic-native/status-bar";
import {SplashScreen} from "@ionic-native/splash-screen";
import {ConfigurationService} from '../services/configuration.service';
import {LogService} from "../services/log.service";
import {UserService} from '../services/user.service';
import {RemoteDataService} from '../services/remote.data.service';
import {BackgroundService} from '../services/background.service';


@Component({
  templateUrl: 'app.html'
})
export class MekitTracerApp
{
  @ViewChild(Nav) nav: Nav;

  /* The page to start with */
  startupPage: any = "HomePage"; //HomePage // ConfigurationSyncstatePage
  rootPage: any = '';

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
      {title: 'Home', icon: 'home', component: "HomePage"}
      , {title: 'Segnalazioni', icon: 'text', component: "TasksPage"}
      , {title: 'Stato', icon: 'cloud', component: "ConfigurationSyncstatePage"}
      , {title: 'Configurazione', icon: 'hammer', component: "ConfigurationSettingsPage"}
    ];

    this.initializeApp();
  }

  initializeApp()
  {
    this.platform.ready().then(() => {
      // Okay, so the platform is ready and our plugins are available.
      LogService.log("APP: Platform is ready. Let's go!");
      return this.configurationService.initialize();
    }).then(() => {
      LogService.log("APP: Configuration service initialized.");
      return this.logService.initialize();
    }).then(() => {
      LogService.log("APP: Log service initialized.");
      return this.userService.initialize();
    }).then(() => {
      LogService.log("APP: User service initialized.");
      return this.remoteDataService.initialize();
    }).then(() => {
      LogService.log("APP: RemoteData service initialized.");
      return this.backgroundService.initialize();
    }).then(() => {
      LogService.log("APP: Background service initialized.");
      this.presentStartupPage();
    }).catch(e => {
      LogService.error(e, "APP-INIT-ERROR");
    })
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

