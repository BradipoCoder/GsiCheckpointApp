/**
 * Checkpoint Provider
 */

import {Injectable} from '@angular/core';
import {OfflineCapableRestService} from '../services/offline.capable.rest.service';
import {ConfigurationService} from '../services/configuration.service';
import {LocalDocumentProvider} from './local.document.provider';
import {Checkpoint} from '../models/Checkpoint';
import {Checkin} from '../models/Checkin';
import {Promise} from '../../node_modules/bluebird'
import _ from "lodash";
import * as moment from 'moment';
import {CrmDataModel} from "../models/crm.data.model";

@Injectable()
export class CheckpointProvider extends LocalDocumentProvider
{
  protected underlying_model:any = Checkpoint;

  protected database_name = "checkpoint";

  protected database_indices = [
    {
      name: 'idx_date_modified',
      fields: ['date_modified']
    }, {
      name: 'idx_date_entered',
      fields: ['date_entered']
    }, {
      name: 'idx_sync_last_check',
      fields: ['sync_last_check']
    },
    {
      name: 'idx_type',
      fields: ['type']
    },
    {
      name: 'idx_code',
      fields: ['code']
    },
    {
      name: 'idx_company',
      fields: ['account_id_c']
    },
    {
      name: 'idx_company_type',
      fields: ['account_id_c', 'type']
    }
  ];

  //@todo: remove this!!! MOVED TO MODEL!
  protected remote_table_name = "mkt_Checkpoint";


  constructor(protected configurationService: ConfigurationService,
              protected offlineCapableRestService: OfflineCapableRestService)
  {
    super(configurationService, offlineCapableRestService);

    let model = new Checkpoint();
    this.module_fields = model.getDefinedProperties();

    //{auto_compaction: true, revs_limit: 10}
    this.database_options.revs_limit = 1;

    this.sync_configuration = {
      syncFunctions: ['syncDownNew', 'syncDownChanged', 'syncDownDeleted'],
      remoteDbTableName: this.underlying_model.DB_TABLE_NAME,
      remoteQuery: "account_id_c = '3aaaca35-bf86-5e1b-488b-591abe50a893'",//CSI checkpoints
      processRecordsAtOnce: 25
    };
  }

  /**
   *
   * @param {Checkpoint} checkpoint
   * @param {Boolean} [forceUpdate]
   * @param {String} [findById] - when document contains the new id - you need to use this param to find the document
   * @returns {Promise<string>}
   */
  public store(checkpoint: Checkpoint, forceUpdate: boolean = false, findById: any = false): Promise<string>
  {
    return super.storeDocument(checkpoint, forceUpdate, findById);
  }

  /**
   *
   * @param {{}} options
   * @returns {Promise<Checkpoint>}
   */
  public getCheckpoint(options: any): Promise<Checkpoint>
  {
    let self = this;
    return new Promise(function (resolve, reject) {
      self.findDocuments(options).then((res) => {
        if (_.size(res.docs) < 1)
        {
          throw new Error("Codice locale sconosciuto!");
        }
        if (_.size(res.docs) > 1)
        {
          throw new Error("Locali multipli per il codice!");
        }
        let checkpoint = new Checkpoint(res.docs[0]);
        resolve(checkpoint);
      }).catch((e) => {
        reject(e);
      });
    });
  }

  /**
   * Returns checkpoints found by options
   *
   * @returns {Promise<any>}
   */
  public find(options: any): Promise<any>
  {
    let self = this;
    return new Promise(function (resolve, reject) {
      self.findDocuments(options).then((res) => {
        let answer = [];
        if (!_.isUndefined(res.docs) && _.size(res.docs))
        {
          let docs = _.concat([], res.docs);
          _.each(docs, function (doc) {
            answer.push(new Checkpoint(doc));
          });
        }
        resolve(answer);
      }).catch((e) => {
        console.error(e);
        reject(e);
      });
    });
  }

  /**
   * Returns all IN and OUT type checkpoints
   *
   * @returns {Promise<any>}
   */
  public getInOutCheckpoints(): Promise<any>
  {
    let self = this;
    return new Promise(function (resolve, reject) {
      let findPromises = [];
      //@todo: for some reason index on 'type' does not work - when using combined selector
      findPromises.push(self.findDocuments({selector: {type: Checkpoint.TYPE_IN}}));
      findPromises.push(self.findDocuments({selector: {type: Checkpoint.TYPE_OUT}}));
      Promise.all(findPromises).then((res) => {
        let answer = [];
        _.each(res, function (obj) {
          answer = _.concat(answer, obj.docs);
        });
        resolve(answer);
      }).catch((e) => {
        console.error(e);
        reject(e);
      });
    });
  }

  /**
   *
   * @param {any} documents
   * @returns {Promise<any>}
   */
  public setTypeOnCheckins(documents): Promise<any>
  {
    let self = this;

    return new Promise(function (resolve, reject) {
      let promises = [];
      _.each(documents, function (checkin) {
        promises.push(self.setTypeOnCheckin(checkin));
      });
      Promise.all(promises).then((newDocs) => {
        resolve(newDocs);
      });
    });
  }

  /**
   *
   * @param {Checkin} checkin
   * @returns {Promise<any>}
   */
  public setTypeOnCheckin(checkin: Checkin): Promise<any>
  {
    let self = this;

    return new Promise(function (resolve) {
      self.db.get(checkin.mkt_checkpoint_id_c).then((checkpoint: Checkpoint) => {
        checkin.setType(checkpoint.type);
        resolve(checkin);
      }).catch(() => {
        resolve(checkin);
      });
    });
  }

  /**
   * @returns {Promise<any>}
   */
  public initialize(): Promise<any>
  {
    //super.initialize();
    let self = this;
    return new Promise(function (resolve, reject) {
      self.setupDatabase().then(() => {
        resolve();
      }).catch((e) => {
        reject(e);
      });
    });
  }
}

