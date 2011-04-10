/**
 * @fileoverview Class for the framework's extensible server.
 *
 * @author dan@pupi.us (Daniel Pupius)
 */

module.exports = Server; 

var App = require('./app');
var Context = require('./context');
var Dispatcher = require('./dispatcher');
var util = require('./util');
var flags = require('flags');
var fs = require('fs');



/**
 * @param {number} port The port number to listen for HTTP requests.
 * @param {string} host The host to listen for HTTP requests.
 * @constructor
 */
function Server(port, host) {
  Server.super_.call(this);
  
  var context = this.getContext();
  
  // Construct and register the dispatcher.
  this.dispatcher_ = context.registerInstance(
      'dispatcher', new Dispatcher(context, port, host));
};
util.inherits(Server, App);


/**
 * Adds an interceptor to the dispatcher.  This is a convenience for commonly
 * used functionality.  See Dispatcher docs for more info.
 * @param {function(Context, function())|Object} interceptor The interceptor.
 * @return {!Server} This instance, for chaining.
 */ 
Server.prototype.addInterceptor = function(interceptor) {
  this.dispatcher_.addInterceptor(interceptor);
  return this;
};


/**
 * Adds a Connect Middleware function as an interceptor.
 *
 * See http://howtonode.org/connect-it
 *
 * It should be noted that currently interceptors are only run on requests that
 * have an action registered.  If you want connect to run on any URL make sure
 * you have a fallback action registered on /* that 404s by default.
 *
 * @param {function(Reqest, Response, function)} fn 
 * @return {!Server} This instance, for chaining.
 */
Server.prototype.addConnectMiddleware = function(fn) {
  this.addInterceptor(function(ctx, proceed) {
    fn(ctx.get('request'), ctx.get('response'), proceed);
  });
  return this;
};


/**
 * Adds an action to the dispatcher.  This is a convenience for commonly
 * used functionality.  See Dispatcher docs for more info.
 * @param {string|Object} path The path to match (or an action object).
 * @param {function(Context)|{{execute:function(Context)}}} action The action
 *    function to execute, or an object with an execute method.
 * @return {!Server} This instance, for chaining.
 */
Server.prototype.addAction = function(path, action) {
  if (typeof path == 'object') {
    action = path;
    path = action.path;
  }
  this.dispatcher_.addAction(path, action);
  return this;
};


/**
 * Makes the server support HTTPS using the provided credentials.
 * @param {string} key Location of the privatekey.pem file.
 * @param {string} cert Location of the certiciate.pem file.
 * @return {!Server} This instance for chaining.
 */
Server.prototype.withCredentials = function(key, cert) {
  this.dispatcher_.setCredentials({
    key: fs.readFileSync(key),
    cert: fs.readFileSync(cert)
  });
  return this;
};


/**
 * Called after all the modules have been started.
 * @param {function} opt_callback Optional callback that should be executed when
 *    the server starts up.
 */
Server.prototype.onStart = function(opt_callback) {
  this.dispatcher_.start();
  Server.super_.prototype.onStart.call(this, opt_callback);
};
