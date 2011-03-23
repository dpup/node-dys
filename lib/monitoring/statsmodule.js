/**
 * @fileoverview A module that installs tools for monitoring the status of the
 * server.
 *
 * Components can register functions with the 'stats' service that report
 * information about their state.  These stats can be viewed at /__stats or
 * queried by external monitoring tools. 
 * 
 * @author dan@pupi.us (Daniel Pupius)
 */

module.exports = StatsModule;

var util = require('../util');
var ActionModule = require('../actionmodule');
var StatsAction = require('./statsaction');
var StatsService = require('./statsservice');
var SimpleAction = require('../simpleaction');


/**
 * Constructs a new stats module.
 *
 * @constructor
 */
function StatsModule() {
  StatsModule.super_.call(this);  
}
util.inherits(StatsModule, ActionModule);


/**
 * Registers the stats service with the root context and adds an action at
 * /__stats/ to serve the stats page.  A simple action is added at /__up/ to
 * allow fast queries of whether the server is ... up.
 * @param {!Context} ctx The root context
 */
StatsModule.prototype.init = function(ctx) { 
  this.addAction('/__up/', SimpleAction.newSubClass(200, 'healthy'));
  this.addAction('/__stats/', StatsAction);
  ctx.registerInstance('stats', new StatsService());
};
