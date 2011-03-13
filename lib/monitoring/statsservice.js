

module.exports = StatsService;


function StatsService() {
  this.registry_ = {};
};


StatsService.prototype.register = function(key, callback, opt_scope) {
  this.registry_[key] = {
    callback: callback,
    scope: opt_scope
  };
  return this;
};


StatsService.prototype.getStats = function() {
  var stats = {
    'process': {
      'gid': process.getgid(),
      'pid': process.pid,
      'version': process.version,
      'platform': process.platform
    },
    'memory': process.memoryUsage()
  };
  for (var key in this.registry_) {
    stats[key] = this.registry_[key].callback.call(this.registry_[key].scope);
  }
  return stats;
};
