/**
 * @fileoverview Module that installs the Request Logging interceptor.
 *
 * @author dan@pupi.us (Daniel Pupius)
 */

module.exports = Module;

var RequestLogger = require('./requestlogger');


/**
 * Constructs a new Request Log Module.
 * @param {string} dirLog The directory to store log files in.
 * @constructor
 */
function Module(logDir) {
  this.logDir_ = logDir;
}


/**
 * @param {!Context} ctx
 */
Module.prototype.start = function(ctx) {
  var logRecorder = new RequestLogger(ctx);
  logRecorder.setLogDir(this.logDir_);
  ctx.get('dispatcher').addInterceptor(logRecorder);
};
