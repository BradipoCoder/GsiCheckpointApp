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
import {LogService} from "../services/log.service";

@Injectable()
export class CheckpointProvider extends LocalDocumentProvider
{
  protected underlying_model: any = Checkpoint;

  protected database_name = "checkpoint";

  protected codeIdCache:any = {};

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
      processRecordsAtOnce: 80,
      maxRecords: 0
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
        LogService.log(e, LogService.LEVEL_ERROR);
        reject(e);
      });
    });
  }

  /**
   *
   * @param {{}} options
   * @returns {Promise<Checkpoint>}
   */
  public getCheckpoint(options: any): Promise<Checkpoint>
  {
    let self = this;
    return new Promise((resolve, reject) => {

      //try to use in-memory code-id to speed up code search
      if(!_.isUndefined(options.selector) && !_.isUndefined(options.selector.code))
      {
        //LogService.log("Looking for checkpoint by CODE: "  + options.selector.code);
        let candidate = _.find(self.codeIdCache, ['code', options.selector.code]);
        if(!_.isUndefined(candidate.id))
        {
          options.selector = {"id": candidate.id};
          LogService.log("CP - used cache for code("+candidate.code+") to get id : "  + candidate.id);
        }
      }

      //LogService.log("getCheckpoint OPTIONS: "  + JSON.stringify(options));

      self.findDocuments(options).then((res) => {
        if (_.size(res.docs) < 1)
        {
          return reject(new Error("Locale sconosciuto!" + JSON.stringify(options)));
        }

        if (_.size(res.docs) > 1)
        {
          return reject(new Error("Locali multipli per il codice!"));
        }

        let checkpoint = new Checkpoint(res.docs[0]);
        resolve(checkpoint);
      }, (e) => {
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
      findPromises.push(self.findDocuments({selector: {type: Checkpoint.TYPE_IN}}));
      findPromises.push(self.findDocuments({selector: {type: Checkpoint.TYPE_OUT}}));
      Promise.all(findPromises).then((res) => {
        let answer = [];
        _.each(res, function (obj) {
          answer = _.concat(answer, obj.docs);
        });
        resolve(answer);
      }).catch((e) => {
        LogService.log(e, LogService.LEVEL_ERROR);
        reject(e);
      });
    });
  }

  /**
   * codeIdCache will be used to quickly find document id by code - in memory search
   * @returns {Promise<any>}
   */
  private createInMemoryCodeIdArray(): Promise<any>
  {
    let self = this;
    return new Promise(function (resolve, reject) {
      self.findDocuments({
        selector: {},
        fields: ['code', 'id'],
      }).then((res) => {
        if (!_.isUndefined(res.docs) && _.size(res.docs))
        {
          self.codeIdCache = res.docs;
          //LogService.log("ID-CODE ARR: " + JSON.stringify(self.codeIdCache));
          LogService.log("ID-CODE array length: " + _.size(self.codeIdCache));
          resolve();
        }
      });
    });
  }

  /**
   * @returns {any}
   */
  protected getDbIndexDefinition(): any
  {
    return _.concat(super.getDbIndexDefinition(), [
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
    ]);
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
        return self.createInMemoryCodeIdArray();
      }).then(() => {
        resolve();
      }).catch((e) => {
        reject(e);
      });
    });
  }
}

