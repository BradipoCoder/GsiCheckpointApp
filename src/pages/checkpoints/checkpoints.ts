import { Component } from '@angular/core';
import { CheckpointProvider } from '../../providers/checkpoint.provider';
import {Checkpoint} from "../../models/Checkpoint";

@Component({
  selector: 'page-checkpoints',
  templateUrl: 'checkpoints.html'
})
export class CheckpointsPage {

  /**
   *
   * @type {Checkpoint[]}
   */
  private checkpoints: any = [];

  constructor(public checkpointProvider: CheckpointProvider)
  {
    this.refreshCheckpoints();
  }

  private refreshCheckpoints():void
  {
    //this.checkpoints = this.checkpointProvider.getInMemoryDocuments(['sync_last_check'], false, 10);
    let findOptions =
      {
        selector: {sync_last_check: {"$gt": null}},
        sort: [{'sync_last_check': 'asc'}],
        limit: 25
      };
    this.checkpointProvider.find(findOptions).then(
      (checkpoints:Checkpoint[]) => {
      this.checkpoints = checkpoints;
    })
  }


  /**
   * Updates the in-memory list of documents from local data storage
   *
   * @returns {Promise<number>}
   */
  /*
  public refreshInMemoryDocuments(): Promise<number>
  {
    let self = this;
    return new Promise(function (resolve, reject)
    {
      self.IN_MEMORY_DOCUMENTS = [];

      let findOptions =
        {
          selector: {sync_last_check: {"$gt": null}},
          sort: ['sync_last_check'],
          limit: self.IN_MEMORY_DOCUMENTS_HARD_LIMIT
        };
      self.findDocuments(findOptions).then((res) =>
      {
        if (!_.isUndefined(res.docs) && _.size(res.docs))
        {
          let docs = _.concat([], res.docs);
          //_.reverse(docs);

          _.each(docs, function (doc)
          {
            self.IN_MEMORY_DOCUMENTS.push(new Checkpoint(doc));
          });
        }

        resolve(_.size(self.IN_MEMORY_DOCUMENTS));
      }).catch((e) =>
      {
        console.error(e);
        reject(e);
      });
    });
  }
  */

  /**
   *  @param {any} [sortBy]
   *  @param {boolean} [reverse]
   *  @param {number} [limit]
   *
   *  @returns {any}
   */
  /*
  public getInMemoryDocuments(sortBy:any = [], reverse:boolean = false, limit:number = 0): any
  {
    let answer =  this.IN_MEMORY_DOCUMENTS;

    if(_.size(sortBy))
    {
      answer = _.sortBy(answer, sortBy);
    }

    if(reverse)
    {
      _.reverse(answer);
    }

    if(limit)
    {
      answer = _.slice(answer, 0, limit);
    }

    return answer;
  }
  */

}
