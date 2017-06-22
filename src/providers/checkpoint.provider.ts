/**
 * Checkpoint Provider
 */
import { Injectable } from '@angular/core';
import { OfflineCapableRestService } from '../services/offline.capable.rest.service';
import {RestDataProvider} from './rest.data.provider';
import {Checkpoint} from '../models/Checkpoint';
import _ from "lodash";

@Injectable()
export class CheckpointProvider extends RestDataProvider
{
  database_name = "checkpoint";
  database_options = {revs_limit: 999};

  remote_table_name = "mkt_Checkpoint";

  constructor(protected offlineCapableRestService: OfflineCapableRestService)
  {
    super(offlineCapableRestService);
    this.initialize();
  }



  public syncWithRemote(): Promise<any>
  {
    let self = this;
    let checkpoint = new Checkpoint();
    let checkpointFields = checkpoint.getDefinedProperties();

    return new Promise(function (resolve, reject)
    {





      self.offlineCapableRestService.getEntryList(self.remote_table_name, {
        select_fields: checkpointFields,
        order_by: 'code ASC',
        max_results: 50
      }).then((res) => {
        console.log("CHECKIN LIST", res);
        if (!_.isEmpty(res.entry_list)) {
          let checkpoint:Checkpoint;
          _.each(res.entry_list, function (remoteData) {
            checkpoint = new Checkpoint(remoteData);
            checkpoint.dump();
          });
        }



        resolve();
      }).catch((e) => {
        reject(e);
      });
    });
  }

  protected initialize(): void
  {


    super.initialize();
    //now database is available

  }
}
