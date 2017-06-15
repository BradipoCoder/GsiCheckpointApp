/**
 * The responsibility of this class is to be a proxy for all different types of Rest Consumer libraries
 * such as (SugarCrmJsRestConsumer) providing means to select which one to use and a unified interface
 * through which to interact with remote end.
 */
import {Injectable} from '@angular/core';

@Injectable()
export class RestService
{
  private consumer: any;

  /**
   * Create a relationship between records of two modules
   * Proxy method
   *
   * @param {String}      module_name
   * @param {String}      id
   * @param {String}      link_field_name
   * @param {Array}       related_ids
   * @param {Object}      parameters
   *
   * @return {Promise}
   */
  setRelationship(module_name:string, id:string, link_field_name:string, related_ids:any, parameters = {}): Promise<any>
  {
    return this.consumer.setRelationship(module_name, id, link_field_name, related_ids, parameters);
  }

  /**
   *
   * @param {string} module_name
   * @param {array} [id_list]
   * @returns {Promise<any>}
   */
  deleteEntries(module_name: string, id_list = []): Promise<any>
  {
    return this.consumer.setEntries(module_name, id_list);
  }

  /**
   *
   * @param {string} module_name
   * @param {string} id
   * @returns {Promise<any>}
   */
  deleteEntry(module_name: string, id: string): Promise<any>
  {
    return this.consumer.deleteEntry(module_name, id);
  }

  /**
   *
   * @param {string} module_name
   * @param {array} [entry_list]
   * @returns {Promise<any>}
   */
  setEntries(module_name: string, entry_list = []): Promise<any>
  {
    return this.consumer.setEntries(module_name, entry_list);
  }

  /**
   *
   * @param {string} module_name
   * @param {string|boolean} id
   * @param {object} [parameters]
   * @returns {Promise<any>}
   */
  setEntry(module_name: string, id: string|boolean, parameters = {}): Promise<any>
  {
    return this.consumer.setEntry(module_name, id, parameters);
  }

  /**
   *
   * @param {string} module_name
   * @param {string} id
   * @param {object} [parameters]
   * @returns {Promise<any>}
   */
  getEntry(module_name: string, id: string, parameters = {}): Promise<any>
  {
    return this.consumer.getEntry(module_name, id, parameters);
  }

  /**
   *
   * @param {string} module_name
   * @param {object} [parameters]
   * @returns {Promise<any>}
   */
  getEntries(module_name: string, parameters = {}): Promise<any>
  {
    return this.consumer.getEntries(module_name, parameters);
  }

  /**
   *
   * @param {string} module_name
   * @param {object} [parameters]
   * @returns {Promise<any>}
   */
  getEntriesCount(module_name: string, parameters = {}): Promise<any>
  {
    return this.consumer.getEntriesCount(module_name, parameters);
  }

  /**
   *
   * @param {string} module_name
   * @param {object} [parameters]
   * @returns {Promise<any>}
   */
  getEntryList(module_name: string, parameters = {}): Promise<any>
  {
    return this.consumer.getEntryList(module_name, parameters);
  }

  /**
   *
   * @param {string} module_name
   * @param {array} [fields]
   * @returns {Promise<any>}
   */
  getModuleFields(module_name: string, fields = []): Promise<any>
  {
    return this.consumer.getModuleFields(module_name, fields);
  }

  /**
   *
   * @returns {Promise<any>}
   */
  getAvailableModules(): Promise<any>
  {
    return this.consumer.getAvailableModules();
  }

  /**
   *
   * @returns {Promise<any>}
   */
  getServerInfo(): Promise<any>
  {
    return this.consumer.getServerInfo();
  }

  /**
   *
   * @param {string} username
   * @param {string} password
   * @returns {Promise<any>}
   */
  login(username: string, password: string): Promise<any>
  {
    return this.consumer.login(username, password);
  }

  /**
   *
   * @returns {Promise<any>}
   */
  logout(): Promise<any>
  {
    return this.consumer.logout();
  }

  /**
   *
   * @returns {any}
   */
  getAuthenticatedUser(): any
  {
    return this.consumer.getAuthenticatedUser();
  }

  /**
   *
   * @returns {Promise<any>}
   */
  getUserId(): Promise<any>
  {
    return this.consumer.getUserId();
  }

  /**
   *
   * @returns {Promise<any>}
   */
  isAuthenticated(): Promise<any>
  {
    return this.consumer.isAuthenticated();
  }

  /**
   * @param {any} consumer
   */
  protected _initialize(consumer: any): void
  {
    this.consumer = consumer;
  }
}
