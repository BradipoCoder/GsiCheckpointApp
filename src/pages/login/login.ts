import {Component, OnInit} from '@angular/core';
import {NavController, LoadingController, ToastController} from 'ionic-angular';
import {UserService} from '../../services/user.service';
import {RemoteDataService} from '../../services/remote.data.service';
import _ from "lodash";

@Component({
  selector: 'page-login',
  templateUrl: 'login.html'
})
export class LoginPage implements OnInit
{
  private username:string = '';
  private password:string = '';

  constructor(public navCtrl: NavController
    , private loadingCtrl: LoadingController
    , private toastCtrl: ToastController
    , private userService: UserService
    , private remoteDataService: RemoteDataService)
  {/**/}

  login(): void
  {
    let loader = this.loadingCtrl.create({
      content: "Autenticazione in corso...",
      duration: 5000
    });
    loader.present();

    this.userService.login(this.username, this.password).then(() => {
      //console.log("LOGIN OK");
      this.remoteDataService.initialize().then(() => {
        loader.dismiss();
        this.navCtrl.resize();
      }, (e) => {
        console.error(e);
        loader.dismiss();
      });
    }, (e) => {
      let toast = this.toastCtrl.create({
        message: 'Nome utente o password errati!',
        duration: 3000,
        position: 'top'
      });
      toast.present();
      loader.dismiss();
    });

  }

  ngOnInit():void
  {

    if(!_.isEmpty(this.username) && !_.isEmpty(this.password)) {
      console.log("AUTOLOGIN[user: "+this.username+"]...");
      let chkInt = setInterval(function(self){
        if(self.userService.is_initialized)
        {
          clearInterval(chkInt);
          chkInt = null;
          console.log("AUTOLOGIN READY");
          self.login();
        }
      }, 1000, this);
    }
  }
}
