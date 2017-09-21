import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import {UserService} from '../../services/user.service';
import {RemoteDataService} from '../../services/remote.data.service';
import {OfflineCapableRestService} from '../../services/offline.capable.rest.service';

@Component({
  selector: 'page-checkpoints',
  templateUrl: 'checkpoints.html'
})
export class CheckpointsPage {


  constructor(public navCtrl: NavController
    , public userService: UserService
    , public remoteDataService: RemoteDataService
    , public offlineCapableRestService: OfflineCapableRestService)
  {

  }





}
