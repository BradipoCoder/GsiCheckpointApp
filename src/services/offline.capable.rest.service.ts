/**
 * Created by jack on 15/06/17.
 */
/**
 * The responsibility of this class is to:
 * a) keep hashed user passwords so that they can be identified when off-line
 * b) be a bucket for unsyncronized data to be pushed to remote when off-line
 * c) be a bucket for important remote data necessary for app when off-line
 * d) control when connection is available and empty buckets
 *
 */

import {Injectable} from "@angular/core";
import {Platform} from "ionic-angular";
import {Network} from "@ionic-native/network";
import {RestService} from "./rest.service";
import Rx from "rxjs/Rx";
import {Observable} from "rxjs/Observable";
import {Subject} from "rxjs/Subject";
import _ from "lodash";

@Injectable()
export class OfflineCapableRestService extends RestService
{
  private is_network_connected: boolean;
  private networkStateEventStream: Subject<boolean> = new Rx.Subject();
  public networkConnectedObservable: Observable<boolean> = Rx.Observable.create(e => this.networkStateEventStream = e);


  constructor(private platform: Platform, private network: Network)
  {
    super();
  }


  /**
   *
   * @returns {boolean}
   */
  public setIsNetworkConnected(is_connected: boolean): void
  {
    if (this.is_network_connected !== is_connected)
    {
      console.log("NETWORK: " + (is_connected ? "ON" : "OFF"));
      this.is_network_connected = is_connected;
      this.networkStateEventStream.next(is_connected);
    }
  }

  /**
   *
   * @returns {boolean}
   */
  public isNetworkConnected(): boolean
  {
    return this.is_network_connected;
  }


  /**
   * @param {string} rest_api_url
   * @param {string} rest_api_version
   */
  initialize(rest_api_url: string, rest_api_version: string): void
  {

    /* Subsribe to network and observe connection/disconnection */
    this.platform.ready().then(() =>
    {
      let conn = true;
      if (!this.platform.is("core"))
      {
        conn = !_.includes(['unknown', 'none'], this.network.type);
        this.network.onConnect().subscribe(() =>
        {
          this.setIsNetworkConnected(true);
        });

        this.network.onDisconnect().subscribe(() =>
        {
          this.setIsNetworkConnected(false);
        });
      }
      this.setIsNetworkConnected(conn);
    });

    //@todo: remove OFFLAJN
    super.initialize(rest_api_url, rest_api_version);
  }
}
