

module.exports = Module;

var LogRecorder = require('./LogRecorder');


function Module(logDir) {
  this.logDir_ = logDir;
}

Module.prototype.init = function(ctx) {
  ctx.get('core.dispatcher').addInterceptor(this.intercept_.bind(this));
};


Module.prototype.start = function(ctx) {
  this.logRecorder_ = new LogRecorder(ctx);
  this.logRecorder_.setLogDir(this.logDir_);
};


Module.prototype.intercept_ = function(ctx, proceed) {
  this.logRecorder_.intercept(ctx, proceed);
};
