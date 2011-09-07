/**
 * @fileoverview A module that installs tools for monitoring the status of the
 * server.
 *
 * Components can register functions with the 'stats' service that report
 * information about their state.  These stats can be viewed at /__stats or
 * queried by external monitoring tools. 
 *
 * A simple action is registered at /__up/ which can be used to query whether
 * a server is up.
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
  this.stats = {};
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
  
  var stats = new StatsService();
  ctx.registerInstance('stats', stats);
  stats.register('requests', this.getRequestStats, this);
  this.addInterceptor(this.intercept.bind(this));
};


StatsModule.prototype.intercept = function(ctx, proceed) {
  var path = ctx.get('path');
  if (path.substr(0, 3) != '/__') {
    var res = ctx.get('response');
    var writeHead = res.writeHead;
    var stats = this.stats;
    res.writeHead = function(status, obj) {
      stats[status] = (stats[status] || 0) + 1;
      writeHead.call(res, status, obj);
    };
  }
  proceed();
};


StatsModule.prototype.getRequestStats = function() {
  return this.stats;
};
