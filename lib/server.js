/**
 * @fileoverview Class for the framework's extensible server.
 *
 * @author dan@pupi.us (Daniel Pupius)
 */

var Context = require('./context');
var Dispatcher = require('./dispatcher');
var LogManager = require('./logmanager');
var flags = require('flags');
var fs = require('fs');


/**
 * @param {number} port The port number to listen for HTTP requests.
 * @param {string} host The host to listen for HTTP requests.
 * @constructor
 */
function Server(port, host) {

  this.modules_ = [];

  this.context_ = new Context.Root();
  
  // Register the LogManager since it's a core service.
  this.context_.registerInstance('log', new LogManager());
  
  // Construct and register the dispatcher.
  this.dispatcher_ = this.context_.registerInstance(
      'dispatcher', new Dispatcher(this.context_, port, host));
};
module.exports = Server;


/**
 * Returns the root context for the server.
 * @return {!Context.Root}
 */
Server.prototype.getContext = function() {
  return this.context_;
};


/**
 * Adds modules to the server.
 *
 * A module should implement an #init(ctx) and/or a #start() method.  When the
 * server starts up, the modules are all initialized with the service context.
 * This 'init' pass should register any service providers on the context.  Then
 * a second pass calls 'start' on the modules.  This 2 pass initialization is
 * used to ensure all services providers are registered before they need to be
 * used.  Therefore, services registered in init should not depend on any
 * services being available until #start.
 *
 * @param {!Module...} var_args One or more modules to register.
 * @return {!Server} This instance, for chaining.
 */
Server.prototype.addModule = function(var_args) {
  this.modules_.push.apply(this.modules_, arguments);
  return this;
};


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
 * @param {string} path The path to match.
 * @param {function(Context)|{{execute:function(Context)}}} action The action
 *    function to execute, or an object with an execute method.
 * @return {!Server} This instance, for chaining.
 */
Server.prototype.addAction = function(path, action) {
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
 * Starts up the server.
 * @return {!Array.<string>} Non-flag command line arguments.
 */
Server.prototype.start = function() {
  var args = flags.parse();
  var ctx = this.context_;
  this.modules_.forEach(function(m) {
    m.init ? m.init(ctx) : null;
  });
  this.modules_.forEach(function(m) {
    m.start ? m.start(ctx) : null;
  });
  this.dispatcher_.start();
  return args;
};
