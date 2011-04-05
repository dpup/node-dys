/**
 * @fileoverview Class for the framework's extensible application.
 *
 * @author dan@pupi.us (Daniel Pupius)
 */

module.exports = App; 

var Context = require('./context');
var flags = require('flags');



/**
 * @constructor
 */
function App() {
  this.modules_ = [];
  this.context_ = new Context.Root();
};


/**
 * Returns the root context for the application.
 * @return {!Context.Root}
 */
App.prototype.getContext = function() {
  return this.context_;
};


/**
 * Adds modules to the application.
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
App.prototype.addModule = function(var_args) {
  this.modules_.push.apply(this.modules_, arguments);
  return this;
};


/**
 * Starts up the application, returns command line args sync, though not all
 * services may be ready at startup.  Use the callback to start using services
 * registered by modules.
 * @param {function()} callback Function executed when the application is ready.
 * @return {!Array.<string>} Non-flag command line arguments.
 */
App.prototype.start = function(opt_callback) {
  var args = flags.parse();
  this.initModules_(opt_callback);
};


/**
 * Called after all the modules have been started.  Intended to be overriden
 * by subclasses.
 */
App.prototype.onStart = function(opt_callback) {
  if (opt_callback) {
    opt_callback(this.context_);
  }
};


App.prototype.initModules_ = function(opt_callback) {
  this.executeAsync_(
      this.modules_, 'init', this.startModules_.bind(this, opt_callback));
};


App.prototype.startModules_ = function(opt_callback) {
  this.executeAsync_(
      this.modules_, 'start', this.onStart.bind(this, opt_callback));  
};


App.prototype.executeAsync_ = function(arr, method, callback) {
  var ctx = this.context_;
  var i = 0;
  function execute() {
    var item = arr[i++];
    if (!item) {
      callback();
    } else if (item[method]) {
      var rv = item[method](ctx, execute);
      if (rv !== true) {
        execute();
      }
    } else {
      execute();
    }
  }
  execute();
};
