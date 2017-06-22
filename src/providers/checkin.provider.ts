/**
 * Checkin Provider
 */
import {Injectable} from '@angular/core';
import { OfflineCapableRestService } from '../services/offline.capable.rest.service';
import {RestDataProvider} from './rest.data.provider';
import {Checkin} from '../models/Checkin';

@Injectable()
export class CheckinProvider extends RestDataProvider
{
  database_name = "checkin";
  database_options = {revs_limit: 999};

  constructor(protected offlineCapableRestService: OfflineCapableRestService)
  {
    super(offlineCapableRestService);
    this.initialize();
  }






  protected initialize(): void
  {


    super.initialize();
  }
}
