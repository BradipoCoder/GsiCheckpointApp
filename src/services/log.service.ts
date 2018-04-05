/** CORE */
import {Injectable} from '@angular/core';
/** SERVICES */
import {ConfigurationService} from './configuration.service';

import _ from "lodash";

@Injectable()
export class LogService
{
  public static readonly LEVEL_INFO: string = "INFO";
  public static readonly LEVEL_WARN: string = "WARN";
  public static readonly LEVEL_ERROR: string = "ERROR";
  public static readonly LEVEL_NONE: string = "NONE";

  public static last_error: Error = new Error("OK");

  private static logLevel = LogService.LEVEL_INFO;

  constructor(private configurationService: ConfigurationService)
  {/**/}

  /**
   * @returns {Promise<any>}
   */
  public initialize(): Promise<any>
  {
    let self = this;

    return new Promise(function (resolve)
    {
      self.configurationService.databaseChangeObservable.subscribe((data) => {
        if(!_.isUndefined(data["id"]) && data.id == "log_level")
        {
          self.resetLogLevelToConfigurationValue().then(() => {
          });
        }
      });

      self.resetLogLevelToConfigurationValue().then(() =>
      {
        resolve();
      });
    });
  }

  private resetLogLevelToConfigurationValue(): Promise<any>
  {
    let self = this;

    return new Promise(function (resolve)
    {
      self.configurationService.getConfig('log_level', LogService.LEVEL_NONE).then((value) =>
      {
        LogService.log("Setting log level to configured value: " + value);
        LogService.setLogLevel(value);
        resolve();
      });
    });
  }

  /**
   *
   * @returns {string}
   */
  public static getLogLevel(): string
  {
    return LogService.logLevel;
  }

  /**
   *
   * @param {string} logLevel
   */
  public static setLogLevel(logLevel:string): void
  {
    LogService.logLevel = _.includes(
      [LogService.LEVEL_INFO, LogService.LEVEL_WARN, LogService.LEVEL_ERROR, LogService.LEVEL_NONE]
      , logLevel) ? logLevel : LogService.LEVEL_NONE;
  }

  /**
   *
   * @param {string} msg
   * @param {string} [logLevel]
   */
  public static log(msg: string, logLevel: string = LogService.LEVEL_INFO): void
  {
    let level = _.includes(
      [LogService.LEVEL_INFO, LogService.LEVEL_WARN, LogService.LEVEL_ERROR, LogService.LEVEL_NONE]
      , logLevel) ? logLevel : LogService.LEVEL_INFO;

    if(
      (level == LogService.LEVEL_INFO && _.includes([LogService.LEVEL_INFO], LogService.getLogLevel())) ||
      (level == LogService.LEVEL_WARN && _.includes([LogService.LEVEL_INFO, LogService.LEVEL_WARN], LogService.getLogLevel())) ||
      (level == LogService.LEVEL_ERROR && _.includes([LogService.LEVEL_INFO, LogService.LEVEL_WARN, LogService.LEVEL_ERROR], LogService.getLogLevel()))
    )
    {
      //can log
      switch(level)
      {
        case LogService.LEVEL_INFO:
          console.log(msg);
          break;
        case LogService.LEVEL_WARN:
          console.warn(msg);
          break;
        case LogService.LEVEL_ERROR:
          console.error(msg);
          break;
      }
    } else
    {
      console.info("NO-LOG: " + msg);
    }
  }

  /**
   *
   * @param {Error} error
   */
  public static error(error: Error): void
  {
    LogService.last_error = error;
    LogService.log("^ERR:" + error.message, LogService.LEVEL_ERROR);
  }

  /**
   *
   * @returns {string}
   */
  public static getLastErrorMessage(): string
  {
    return LogService.last_error.message;
  }
}
