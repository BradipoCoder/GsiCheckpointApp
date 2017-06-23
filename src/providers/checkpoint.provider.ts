/**
 * Checkpoint Provider
 */
import { Injectable } from '@angular/core';
import { OfflineCapableRestService } from '../services/offline.capable.rest.service';
import {RestDataProvider} from './rest.data.provider';
import {Checkpoint} from '../models/Checkpoint';
import {Promise} from '../../node_modules/bluebird'
import _ from "lodash";
import * as moment from 'moment';

@Injectable()
export class CheckpointProvider extends RestDataProvider
{
  database_name = "checkpoint";
  remote_table_name = "mkt_Checkpoint";


  constructor(protected offlineCapableRestService: OfflineCapableRestService)
  {
    super(offlineCapableRestService);
    this.initialize();

    let model = new Checkpoint();
    this.module_fields = model.getDefinedProperties();
  }

  /**
   *
   * @returns {Promise<any>}
   */
  public syncWithRemote(): Promise<any>
  {
    let self = this;
    let batchSize = 50;
    let forceUpdate = false;

    return new Promise(function (resolve, reject)
    {
      let sequence = 0;
      let offset = 0;
      let hasMore = true;
      self.promiseWhile(hasMore, function(hasMore) {
        return hasMore;
      }, function(hasMore) {
        return new Promise(function (resolve, reject)
        {
          offset = sequence * batchSize;
          self.offlineCapableRestService.getEntryList(self.remote_table_name, {
            select_fields: self.module_fields,
            order_by: 'code ASC',
            max_results: batchSize,
            offset: offset
          }).then((res) => {
            //console.log("CHECKPOINT LIST["+seq+"]["+offset+"]", res);
            sequence++;
            hasMore = (res.next_offset < res.total_count) && _.size(res.entry_list) > 0;

            if (!_.isEmpty(res.entry_list)) {
              let documents = [];
              _.each(res.entry_list, function (remoteData) {
                documents.push(new Checkpoint(remoteData));
              });
              self.storeDocuments(documents, forceUpdate).then(() => {
                resolve(hasMore);
              }).catch((e) => {
                reject(e);
              });
            } else {
              resolve(hasMore);
            }
          })
        });
      }).then(() => {
        //console.log("Checkpoint provider - syncWithRemote: done");
        resolve();
      }).catch((e) => {
        console.error(e);
      });
    });
  }

  /**
   *
   */
  protected initialize(): void
  {
    super.initialize();
    //now database is available

  }
}
