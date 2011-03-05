


exports.newServer = function(port, host) {
  var Server = require('./Server');
  return new Server(port, host);
};


exports.newLoggingModule = function(logDir) {
  var LoggingModule = require('./logrecorder/Module');
  return new LoggingModule(logDir);
};


exports.newStaticFileModule = function(options) {
  var StaticFileModule = require('./static/Module');
  return new StaticFileModule(options);
};
