/**
 * @fileoverview Service that allows components to register statistics that
 * will be reported via the stats action at /__stats/.
 *
 * Components should call 'register' with a function that returns data about
 * their status.
 *
 * @author dan@pupi.us (Daniel Pupius)
 */

module.exports = StatsService;


/**
 * @constructor
 */
function StatsService() {
  this.registry_ = {};
};


/**
 * Register a statistics source.
 * @param {string} key A unique key that will be used to identify the stats on
 *    the stats page and provide filtering functionality.
 * @param {function() : Object} callback A function that returns an object
 *    containing the stats data.
 * @praram {Object=} opt_scope Optional scope to call the callback in.
 * @return {StatsService} This instance, for chaining.
 */
StatsService.prototype.register = function(key, callback, opt_scope) {
  this.registry_[key] = {
    callback: callback,
    scope: opt_scope
  };
  return this;
};


/**
 * Returns the current stats.
 * @param {boolean} opt_filter Optional filter used to restrict the keys.
 * @return {Object}
 */
StatsService.prototype.getStats = function(opt_filter) {
  var re = opt_filter ? new RegExp(opt_filter) : null;
  
  var stats = {};
  
  if (!re || re.test('process')) {
    stats['process'] = {
      'gid': process.getgid(),
      'pid': process.pid,
      'version': process.version,
      'platform': process.platform
    };
  }
  
  if (!re || re.test('memory')) {
    stats['memory'] = process.memoryUsage();
  }
  
  for (var key in this.registry_) {
    if (!re || re.test(key)) {
      stats[key] = this.registry_[key].callback.call(this.registry_[key].scope);
    }
  }
  return stats;
};
