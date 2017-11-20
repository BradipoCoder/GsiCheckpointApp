/**
 * Task Provider
 */
import {Injectable} from '@angular/core';
import {OfflineCapableRestService} from '../services/offline.capable.rest.service';
import {ConfigurationService} from '../services/configuration.service';
import {UserService} from "../services/user.service";
import {LocalDocumentProvider} from './local.document.provider';
import {CrmDataModel} from '../models/crm.data.model';
import {Task} from "../models/Task";
import {Promise} from '../../node_modules/bluebird'
import _ from "lodash";
import {LogService} from "../services/log.service";
import {CheckpointProvider} from "./checkpoint.provider";
import {Checkpoint} from "../models/Checkpoint";


@Injectable()
export class TaskProvider extends LocalDocumentProvider
{
  protected underlying_model:any = Task;

  protected database_name = "task";

  constructor(
    protected configurationService: ConfigurationService
    , protected userService: UserService
    , protected offlineCapableRestService: OfflineCapableRestService
    , protected checkpointProvider:CheckpointProvider
  )
  {
    super(configurationService, offlineCapableRestService);

    let model = this.getNewModelInstance();
    this.module_fields = model.getDefinedProperties();

    /*
    * remoteQuery - CRM is role based - no need to filter by user id (it will NOT work)
    */
    this.sync_configuration = {
      syncFunctions: ['syncDownNew', 'syncDownChanged', 'syncDownDeleted', 'syncUpStore'],//, 'syncUpStore'
      remoteDbTableName: this.underlying_model.DB_TABLE_NAME,
      remoteQuery: "",
      processRecordsAtOnce: 25,
      maxRecords: 3
    };
  }

  /**
   *
   * @param {{}} [data]
   * @returns {Task}
   */
  public getNewModelInstance(data:any = {}): Task
  {
    let model:Task = super.getNewModelInstance(data);
    this.setRelatedCheckpointOnTask(model);
    //do something with all tasks
    LogService.log("New Task Instance..." + model.id);
    //
    return model;
  }

  /**
   *
   * @param {Task} task
   */
  public setRelatedCheckpointOnTask(task:Task):void
  {
    if(task.parent_type == "mkt_Checkpoint" && !_.isEmpty(task.parent_id))
    {
      this.checkpointProvider.getCheckpoint({selector: {id: task.parent_id}}).then((checkpoint:Checkpoint) => {
        task.check_point = checkpoint;
        LogService.log("setRelatedCheckpointOnTask DONE:" + checkpoint.id);
      });
    }
  }

  /**
   *
   * @param {Task} task
   * @param {Boolean} [forceUpdate]
   * @param {String} [findById] - when document contains the new id - you need to use this param to find the document
   * @returns {Promise<string>}
   */
  public store(task: Task, forceUpdate: boolean = false, findById: any = false): Promise<string>
  {
    return super.storeDocument(task, forceUpdate, findById);
  }


  /**
   * Returns tasks found by options
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
            answer.push(self.getNewModelInstance(doc));
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
   * @param {string} id
   * @returns {Promise<Task>}
   */
  public getTaskById(id: string): Promise<Task>
  {
    let self = this;
    return new Promise(function (resolve, reject)
    {
      self.getDocumentById(id).then((doc) =>
      {
        let task = self.getNewModelInstance(doc);
        resolve(task);
      }).catch((e) =>
      {
        reject(e);
      });
    });
  }


  /**
   * @todo: this should not work this way but we should be listening to db changes and react to that (immediately)
   *
   * @returns {Promise<any>}
   */
  public syncUpStore():Promise<any>
  {
    let self = this;
    let dbTableName = self.underlying_model.DB_TABLE_NAME;

    return new Promise((resolve) => {
      self.findDocuments({
        selector: {
          $or: [
            {sync_state: CrmDataModel.SYNC_STATE__NEW},
            {sync_state: CrmDataModel.SYNC_STATE__CHANGED},
          ]
        },
      }).then((res) => {
        if(_.isUndefined(res.docs) || !_.size(res.docs))
        {
          LogService.log("syncUpStore[Task] - NOTHING TO SYNC UP");
          resolve();
          return;
        }

        LogService.log("syncUpStore[Task] - DOCS TO SYNC UP: " + _.size(res.docs));

        Promise.reduce(res.docs, (accu, doc) => {
          return new Promise((resolve) => {
            let task = self.getNewModelInstance(doc);
            let isNewOnRemote = _.startsWith(task.id, CrmDataModel.TEMPORARY_ID_PREFIX);
            let parameters = task.getRestData();

            if (isNewOnRemote)
            {
              _.unset(parameters, 'id');
            }

            LogService.log("syncUpStore[Task] - syncing: " + task.id + " - DATA: " + JSON.stringify(parameters));
            self.offlineCapableRestService.setEntry(
              dbTableName,
              isNewOnRemote ? false : task.id,
              parameters
            ).then((res) => {
              if (!res || _.isUndefined(res.id) || !_.isArray(res.entry_list) || _.size(res.entry_list) == 0)
              {
                throw new Error("failed to save on remote!");
              }
              LogService.log("syncUpStore[Task] saved on remote: " + JSON.stringify(res));

              let temporaryLocalStorageId = null;
              let forceUpdate = true;
              if (isNewOnRemote)
              {
                temporaryLocalStorageId = task.id;
                task.id = res.id;
              }
              task.sync_state = CrmDataModel.SYNC_STATE__IN_SYNC;
              return self.storeDocument(task, forceUpdate, temporaryLocalStorageId);
            }, (e) => {
              LogService.log("syncUpStore[Task] remote setEntry error! " + e, LogService.LEVEL_ERROR);
              resolve();
            }).then(() => {
              LogService.log("syncUpStore[Task] updated on local.");
              resolve();
            }, (e) => {
              LogService.log("syncUpStore[Task] local store error! " + e, LogService.LEVEL_ERROR);
              resolve();
            });
          });
        }, null).then(() => {
          LogService.log("syncUpStore[Task] - sync done.");
          resolve();
        }, (e) => {
          LogService.log("syncUpStore[Task] sync error! " + e, LogService.LEVEL_ERROR);
          resolve();
        });
      }, (e) => {
        LogService.log("syncUpStore[Task] document find error! " + e, LogService.LEVEL_ERROR);
        resolve();
      });
    });
  }

  /**
   * @returns {any}
   */
  protected getDbIndexDefinition():any
  {
    return _.concat(super.getDbIndexDefinition(), [
      {
        name: 'idx_date_start',
        fields: ['date_start']
      },
      {
        name: 'idx_sync_state',
        fields: ['sync_state']
      }
    ]);
  }

  /**
   * @returns {Promise<any>}
   */
  public initialize(): Promise<any>
  {
    let self = this;
    return new Promise(function (resolve, reject)
    {
      self.setupDatabase().then(() =>
      {
        resolve();
      }).catch((e) =>
      {
        reject(e);
      });
    });
  }
}
