
var Context = require('./Context');
var Dispatcher = require('./Dispatcher');
var LogManager = require('./LogManager');

/**
 * @param {number} port The port number to listen for HTTP requests.
 * @param {string} host The host to listen for HTTP requests.
 * @constructor
 */
function Server(port, host) {

  this.modules_ = [];

  this.context_ = new Context.Root();
  
  // Register the LogManager since it's a core service.
  this.context_.registerInstance('core.log', new LogManager());
  
  // Construct and register the dispatcher.
  this.dispatcher_ = this.context_.registerInstance(
      'core.dispatcher', new Dispatcher(this.context_, port, host));
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
 * used.
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
 * @param {function(Context, function())} interceptor The interceptor function.
 * @return {!Server} This instance, for chaining.
 */ 
Server.prototype.addInterceptor = function(interceptor) {
  this.dispatcher_.addInterceptor(interceptor);
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
 * Starts up the server.
 */
Server.prototype.start = function() {
  var ctx = this.context_;
  this.modules_.forEach(function(m) {
    m.init ? m.init(ctx) : null;
  });
  this.dispatcher_.start();
  this.modules_.forEach(function(m) {
    m.start ? m.start(ctx) : null;
  });
};
