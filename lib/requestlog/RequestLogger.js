/**
 * @fileoverview Interceptor that logs information about every request to the
 * provided directory.  Log files will be automatically rotated daily.
 *
 * @author dan@pupi.us (Daniel Pupius)
 */


module.exports = RequestLogger;

var fs = require('fs');
var url = require('url');
var util = require('../util');


/**
 * Constructs a new RequestLogger.
 * @param {!Context} ctx The application context.
 * @constructor
 */
function RequestLogger(ctx) {
  this.logger_ = ctx.get('log').getLogger('RequestLogger');
  this.buffer_ = [];
}


/**
 * Id for the flush timer.
 * @type {number}
 * @private
 */
RequestLogger.prototype.timerId_;


/**
 * The directory where request logs should be written.
 * @type {string}
 * @private
 */
RequestLogger.prototype.logDir_;


/**
 * Sets the log directory.
 * @param {string} logDir
 */
RequestLogger.prototype.setLogDir = function(logDir) {
  this.logDir_ = logDir;
  this.currentDate_ = new Date().getDate();
  this.currentFile_ = this.getLogName_();
};


/**
 * Flushes the buffered log messages to the log file.
 */
RequestLogger.prototype.flushNow = function() {
  if (this.timerId_) {
    clearTimeout(this.timerId_);
    this.timerId_ = null;
  }
  
  if (this.buffer_.length == 0) {
    // Nothing to do.
    return;
  }
  
  var buffer = new Buffer(this.buffer_.join('\n') + '\n', 'UTF-8');
  this.buffer_.length = 0;
  
  var fileName = this.currentFile_;
  var logger = this.logger_;
  
  // TODO : Consider keeping file handle open.
  fs.open(fileName, 'a+', '0666', function(err, fd) {
    if (err) {
      logger.log('Failed to open log file [' + fileName + '] ' + err.stack);
    } else {
      fs.write(fd, buffer, 0, buffer.length, null, function(err, written) {
        if (err) {
          logger.log('Failed to write to log file [' + fileName + '] ' + err.stack);
        } else {
          logger.log(written + ' bytes written to ' + fileName);
          fs.close(fd);
        }
      });
    }
  });
};


/**
 * Intercepts the request and sets up logging.
 * @param {!Context} ctx The context object for the request scope.
 * @param {function()} proceed Function to execute the rest of the chain.
 */ 
RequestLogger.prototype.execute = function(ctx, proceed) {
  if (!this.logDir_) {
    this.logger_.log('WARNING : No log directory set');
    proceed();
    return;
  }
  var req = ctx.get('request');
  var res = ctx.get('response');
  var user = ctx.get('auth.username', /* optional */ true);
  
  var reqHeaders = req.headers;
  var resHeaders, resCode;
  
  var writeHead = res.writeHead;
  res.writeHead = function(code, headers) {
    writeHead.call(res, code, headers);
    resCode = code;
    resHeaders = headers;
  };
    
  // We want the logging to happen at the end of the request, so proceed and
  // register an 'after request' callback.
  var that = this;
  proceed(function() {
    var log = util.getDateString() + ' ' + 
        req.connection.remoteAddress + ' ' +
        (user || '-') + ' ' +
        '"' + req.method + ' ' + url.parse(req.url).pathname +
        ' HTTP/' + req.httpVersion + '" ' +
        resCode + ' ' +
        (resHeaders['Content-Length'] || '-') + ' ' +
        (reqHeaders['referer'] || '-') + ' ' +
        (reqHeaders['user-agent'] || '-');
    
    // Rotate the log file, if necessary.
    that.maybeRotateLogFile_();    
    
    // Schedule the next flush.
    that.buffer_.push(log);
    that.scheduleFlush_();

    proceed();
  });
};


RequestLogger.prototype.scheduleFlush_ = function() {
  if (!this.timerId_) {
    this.timerId_ = setTimeout(this.timedFlush_.bind(this), 250);
  }
};


RequestLogger.prototype.timedFlush_ = function() {
  this.timerId_ = null;
  this.flushNow();
};


RequestLogger.prototype.maybeRotateLogFile_ = function() {
  var nowDate = new Date().getDate();
  if (this.currentDate_ != nowDate) {
    this.flushNow();
    this.currentDate_ = nowDate;
    this.currentFile_ = this.getLogName_();
  }
};

RequestLogger.prototype.getDateString_ = function(d) {
  d = d || new Date;
  return d.getFullYear() +
      util.pad(d.getMonth() + 1) + 
      util.pad(d.getDate())
};


RequestLogger.prototype.getLogName_ = function(d) {
  return this.logDir_ + '/requestlog-' + this.getDateString_(d) + '.log';
};
