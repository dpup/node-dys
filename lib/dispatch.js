/**
 * @fileoverview Public interface to dispatch framework components, avoids apps
 * needing to require() all the classes.
 *
 * @author dan@pupi.us (Daniel Pupius)
 */


exports.newServer = function(port, host) {
  var Server = require('./Server');
  return new Server(port, host);
};


exports.newRequestLogModule = function(logDir) {
  var LoggingModule = require('./requestlog/Module');
  return new LoggingModule(logDir);
};


exports.newStaticFileModule = function(options) {
  var StaticFileModule = require('./static/Module');
  return new StaticFileModule(options);
};


exports.newSimpleAction = function(code, content) {
  var SimpleAction = require('./SimpleAction');
  return new SimpleAction(code, content);
};
