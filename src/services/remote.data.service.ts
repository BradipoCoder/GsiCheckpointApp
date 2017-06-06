/**
 * Created by jack on 05/06/17.
 */
import {Injectable} from '@angular/core';
import {RestService} from './rest.service';
import _ from "lodash";

@Injectable()
export class RemoteDataService
{


  constructor(private restService:RestService)
  {
  }
}
