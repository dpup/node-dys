
module.exports = LogRecorder;

var fs = require('fs');
var url = require('url');
var util = require('../util');


function LogRecorder(ctx) {
  this.logger_ = ctx.get('core.log').getLogger('LogRecorder');
  this.buffer_ = [];
}


LogRecorder.prototype.timerId_;
LogRecorder.prototype.logDir_;


LogRecorder.prototype.setLogDir = function(logDir) {
  this.logDir_ = logDir;
  this.currentDate_ = new Date().getDate();
  this.currentFile_ = this.getLogName_();
};


LogRecorder.prototype.flushNow = function() {
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


LogRecorder.prototype.intercept = function(ctx, proceed) {
  if (!this.logDir_) {
    this.logger_.log('WARNING : No log directory set');
    proceed();
    return;
  }
  var req = ctx.get('core.request');
  var res = ctx.get('core.response');
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


LogRecorder.prototype.scheduleFlush_ = function() {
  if (!this.timerId_) {
    this.timerId_ = setTimeout(this.timedFlush_.bind(this), 250);
  }
};


LogRecorder.prototype.timedFlush_ = function() {
  this.timerId_ = null;
  this.flushNow();
};


LogRecorder.prototype.maybeRotateLogFile_ = function() {
  var nowDate = new Date().getDate();
  if (this.currentDate_ != nowDate) {
    this.flushNow();
    this.currentDate_ = nowDate;
    this.currentFile_ = this.getLogName_();
  }
};

LogRecorder.prototype.getDateString_ = function(d) {
  d = d || new Date;
  return d.getFullYear() +
      util.pad(d.getMonth() + 1) + 
      util.pad(d.getDate())
};


LogRecorder.prototype.getLogName_ = function(d) {
  return this.logDir_ + '/requestlog-' + this.getDateString_(d) + '.log';
};
