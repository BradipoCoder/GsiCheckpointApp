import {Component} from '@angular/core';
import {NavController, LoadingController, ToastController} from 'ionic-angular';
import {UserService} from '../../services/user.service';

@Component({
  selector: 'page-login',
  templateUrl: 'login.html'
})
export class LoginPage
{
  //@todo: clear default login data
  private username:string = 'admin';
  private password:string = 'admin';

  constructor(public navCtrl: NavController
    , public loadingCtrl: LoadingController
    , public toastCtrl: ToastController
    , private userService: UserService)
  {}

  login(): void
  {
    let loader = this.loadingCtrl.create({
      content: "Autenticazione in corso...",
    });
    loader.present();


    this.userService.login(this.username, this.password).then(() => {
      //console.log("LOGIN OK");
      loader.dismiss();
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

}
