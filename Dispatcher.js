/**
 * @fileoverview Dispatcher service that is used to handle HTTP requests.
 * @author dan@pupi.us (Daniel Pupius)
 */

var Context = require('./Context');
var PathMatcher = require('./PathMatcher');
var framework = require('../framework');
var http = require('http');
var url = require('url');


/**
 * @param {!Context} context The root context.
 * @param {number} port The port number to listen on.
 * @param {string} host The host string. 
 * @constructor
 */
function Dispatcher(context, port, host) {

  /**
   * Context object used for dependency injection.
   * @type {!Context}
   * @private
   */
  this.context_ = context;

  /**
   * The port that the server should listen on.
   * @type {number}
   * @private
   */
  this.port_ = port;
  
  /**
   * The host that the server should listen on.
   * @type {string}
   * @private
   */
  this.host_ = host;

  /**
   * Array of interceptors.
   * @type {!Array.<IInterceptor>}
   * @private
   */
  this.interceptors_ = [];
  
  /**
   * Path matcher for finding actions.
   * @type {!PathMatcher}
   */
  this.pathMatcher_ = new PathMatcher();
  
  /**
   * Logger instance for the dispatcher.
   * @type {!Logger}
   * @private
   */
  this.logger_ = context.get('core.log').getLogger('Dispatcher');
};
module.exports = Dispatcher;


/**
 * Adds an interceptor to the dispatcher.  Interceptors will be called in
 * order for all requests.
 *
 * An interceptor is just a function and will be called with the arguments:
 *   context, proceedFn.
 * 
 * Calling the proceedFn will continue the interceptor chain and execute the
 * action.  The interceptor can choose not to call the callback and handle the
 * response itself.
 *
 * @param {function(Context, function())} interceptor An interceptor function.
 */
Dispatcher.prototype.addInterceptor = function(interceptor) {
  this.assertNotStarted_();
  this.interceptors_.push(interceptor);
};


/**
 * Adds an action to the dispatcher.
 *
 * An action is either a function or an object that implements the 'execute'
 * method.
 *
 * @param {string} path The path to match.
 * @param {function(Context)|{{execute:function(Context)}}} action The action
 *    function to execute, or an object with an execute method.
 */
Dispatcher.prototype.addAction = function(path, action) {
  this.pathMatcher_.addAction(path, action);
};


/**
 * Starts the HTTP server.
 */
Dispatcher.prototype.start = function() {
  this.assertNotStarted_();
  http.createServer(this.handle.bind(this)).listen(this.port_, this.host_);
  this.logger_.log('Server running at ' + this.host_ + ':' + this.port_);
  this.started_ = true;
  
  // Push a special interceptor that should execute the current action.
  this.interceptors_.push(this.executeActionInterceptor_.bind(this));
};


/**
 * Throws an error if the dispatcher has already been started.
 * @private
 */
Dispatcher.prototype.assertNotStarted_ = function() {
  if (this.started_) {
    throw Error('Dispatcher has already been started.');
  }  
};


/**
 * Handles a new HTTP request coming in.
 * @param {!Object} req The node.js request object.
 * @param {!Object} res The node.js response object.
 */
Dispatcher.prototype.handle = function(req, res) {
  // Create a RequestScope and seed it with the request and response objects.
  var ctx = new Context(this.context_, Context.Scope.REQUEST);
  ctx.seed('core.request', req);
  ctx.seed('core.response', res)
  
  // Protect the rest of the execution so exceptions don't kill the server.
  framework.exec(ctx, function() {
    var path = url.parse(req.url).pathname;
    var info = this.pathMatcher_.getMatch(path);

    if (!info) {
      throw new framework.NotFoundError();
    }
    
    // Seed the context with the action for use in the executeActionInterceptor
    // and anything that needs to query action's annotations or what not.
    ctx.seed('core.action', info.action);
    ctx.seed('core.matches', info.matches);

    // Set up the execution of the interceptor chain.
    var i = 0, isAfter = false, afterFns = [], beforeFns = this.interceptors_;
    var executeChain = framework.wrap(ctx, function(after) {
      
      if (!isAfter) {
        if (after) afterFns.push(after);
        if (i < beforeFns.length) {
          beforeFns[i++](ctx, executeChain);
          return;
        } else {
          isAfter = true;
        }
      }
      var fn = afterFns.pop();
      if (fn) fn(ctx, executeChain);
    });
    
    // Begin execution of the interceptor chain.
    executeChain();
  }, this);
};


/**
 * Executes the action associated with the current request.
 * @param {!Context} context The request scope's context.
 * @param {function()} proceed Callback to continue to the call chain.
 * @private
 */
Dispatcher.prototype.executeActionInterceptor_ = function(context, proceed) {
  // Patch the response object.
  var res = context.get('core.response');
  var writeHead = res.writeHead;
  var end = res.end;
  res.writeHead = function(code, headers) {
    headers['Date'] = (new Date()).toGMTString();
    headers['X-Content-Type-Options'] = 'nosniff';
    headers['Server'] = 'mne';
    writeHead.call(res, code, headers);
  };
  res.end = function() {
    end.apply(res, arguments);
    // Tell the interceptor chain to proceed once the response has been ended.
    proceed();
  };
  
  // Should not get here unless an action exists for this request, so no null
  // check is needed.
  var action = context.get('core.action');
  if (action.execute) {
    action.execute(context);
  } else {
    action(context);
  }
};