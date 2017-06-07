/**
 * Created by jack on 05/06/17.
 */
import {Injectable} from '@angular/core';

/*import * as _ from "../../node_modules/underscore";*/

import _ from "lodash";
import {SugarCrmJsRestConsumer} from "../../node_modules/sugarcrm-js-rest-consumer";


@Injectable()
export class RestService
{
  /* @type SugarCrmJsRestConsumer */
  private sugar:any;


  constructor()
  {
    //import * as SugarCrmJsRestConsumer from '../../node_modules/sugarcrm-js-rest-consumer/SugarCrmJsRestConsumer';



    console.log("TEST(has lib?): " + !_.isUndefined(SugarCrmJsRestConsumer));



    this.sugar = new SugarCrmJsRestConsumer("http://crm.mekit.it", "v4_1");

    let cfg = this.sugar.getConfig();
    console.log("TEST(config):" + JSON.stringify(cfg));

  }


}
