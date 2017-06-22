/**
 * Rest Data Provider
 */
import {Injectable} from '@angular/core';
import {OfflineCapableRestService} from '../services/offline.capable.rest.service';
import PouchDB from "pouchdb";
import _ from "lodash";

@Injectable()
export class RestDataProvider {
  protected database_name: string;
  protected database_options: any = {revs_limit: 250};

  protected remote_table_name: string;

  protected db: any;

  constructor(protected offlineCapableRestService: OfflineCapableRestService)
  {
  }


  protected initialize(): void {
    //let self = this;
    this.db = new PouchDB(this.database_name, this.database_options);
  }
}
