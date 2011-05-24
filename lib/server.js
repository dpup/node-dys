/**
 * @fileoverview Class for the framework's extensible server.
 *
 * @author dan@pupi.us (Daniel Pupius)
 */

module.exports = Server; 

var App = require('./app');
var Context = require('./context');
var PostDataFuture = require('./postdatafuture');
var PathMatcher = require('./pathMatcher');
var base = require('./base');
var logging = require('logging');
var flags = require('flags');
var fs = require('fs');
var http = require('http');
var https = require('https');
var url = require('url');
var util = require('./util');



/**
 * @param {number} port The port number to listen for HTTP requests.
 * @param {string} host The host to listen for HTTP requests.
 * @constructor
 */
function Server(port, host) {
  Server.super_.call(this);
  
  /**
   * The port that the server should listen on.
   * @type {number}
   * @private
   */
  this.port_ = port || 3636;
  
  /**
   * The host that the server should listen on.
   * @type {string}
   * @private
   */
  this.host_ = host || '127.0.0.1';

  /**
   * Server name sent in response headers.
   * @type {string}
   * @private
   */
  this.name_ = 'node-dispatch';

  /**
   * Array of interceptors.
   * @type {!Array.<function(Context, function())|Object}>}
   * @private
   */
  this.interceptors_ = [];
  
  /**
   * Path matcher for finding actions.
   * @type {!PathMatcher}
   */
  this.pathMatcher_ = new PathMatcher();
  
  /**
   * Logger instance for the server.
   * @type {!Logger}
   * @private
   */
  this.logger_ = logging.getLogger('dispatch.Server');
  
  this.registerProviders_();
};
util.inherits(Server, App);


/**
 * Secure credentials to use when creating the server.
 * @type {Object|undefined}
 * @private
 */
Server.prototype.credentials_;


/**
 * Whether the server has been started.
 * @type {boolean}
 * @private
 */
Server.prototype.started_ = false;


/**
 * Adds an interceptor to the server.  Interceptors will be called in
 * order for all requests.
 *
 * An interceptor is just a function and will be called with the arguments:
 *   context, proceedFn.
 * 
 * Calling the proceedFn will continue the interceptor chain and execute the
 * action.  The interceptor can choose not to call the callback and handle the
 * response itself.
 *
 * @param {function(Context, function())|Object} interceptor An interceptor
 *     function or an object that implements an execute method.
 * @return {!Server} This instance, for chaining.
 */
Server.prototype.addInterceptor = function(interceptor) {
  this.assertNotStarted_();
  this.interceptors_.push(interceptor);
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
 * Adds an action to the server.
 *
 * An action is either a function or an object that implements the 'execute'
 * method.
 *
 * @param {string} path The path to match.
 * @param {function(Context)|{{execute:function(Context)}}} action The action
 *    function to execute, or an object with an execute method.
 */
Server.prototype.addAction = function(path, action) {
  this.assertNotStarted_();
  
  if (typeof path == 'object') {
    action = path;
    path = action.path;
  }
  
  if (path instanceof Array) {
    var pm = this.pathMatcher_;
    path.forEach(function(p) {
      pm.addAction(p, action);
    });
  } else {
    this.pathMatcher_.addAction(path, action);
  }
  return this;
};


/**
 * Makes the server support HTTPS using the provided credentials.
 * @param {string} key Location of the privatekey.pem file.
 * @param {string} cert Location of the certiciate.pem file.
 * @return {!Server} This instance for chaining.
 */
Server.prototype.withCredentials = function(key, cert) {
  this.assertNotStarted_();
  this.credentials_ = {
    key: fs.readFileSync(key),
    cert: fs.readFileSync(cert)
  };
  return this;
};


/**
 * Sets the name that this server will use when identifying itself in response
 * headers and the like.
 * @param {string} name The new name.
 * @return {!Server} This instance for chaining.
 */
Server.prototype.setName = function(name) {
  this.name_ = name;
  return this;
};


/**
 * Called after all the modules have been started.
 * @param {function} opt_callback Optional callback that should be executed when
 *    the server starts up.
 */
Server.prototype.onStart = function(opt_callback) {
  this.assertNotStarted_();

  var handler = this.handle.bind(this);
  var server = this.credentials_ ?
      https.createServer(this.credentials_, handler) :
      http.createServer(handler);
  server.listen(this.port_, this.host_);
  
  this.logger_.info('Server running at ' + this.host_ + ':' + this.port_);
  this.started_ = true;
  
  // Push a special interceptor that should execute the current action.
  this.interceptors_.push(this.executeActionInterceptor_.bind(this));
  
  Server.super_.prototype.onStart.call(this, opt_callback);
};


/**
 * Handles a new HTTP request coming in.
 * @param {!Object} req The node.js request object.
 * @param {!Object} res The node.js response object.
 */
Server.prototype.handle = function(req, res) {
  // Create a RequestScope and seed it with the request and response objects.
  var ctx = new Context(this.context_, Context.Scope.REQUEST);
  ctx.seed('request', req);
  ctx.seed('response', res)
  
  // Protect the rest of the execution so exceptions don't kill the server.
  base.exec(ctx, function() {
    var path = url.parse(req.url).pathname;
    var info = this.pathMatcher_.getMatch(path);

    if (!info) {
      throw new base.NotFoundError();
    }
    
    // Seed the context with the action for use in the executeActionInterceptor
    // and anything that needs to query action's annotations or what not.
    ctx.seed('action', info.action);
    ctx.seed('matches', info.matches);
    ctx.seed('path', path);

    // Set up the execution of the interceptor chain.
    var i = 0, isAfter = false, afterFns = [], interceptors = this.interceptors_;
    var executeChain = base.wrap(ctx, function(after) {
      
      if (!isAfter) {
        if (after) afterFns.push(after);
        if (i < interceptors.length) {
          var interceptor = interceptors[i++];
          if (typeof interceptor == 'function') {
            interceptor(ctx, executeChain);
          } else {
            interceptor.execute(ctx, executeChain);
          }
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
Server.prototype.executeActionInterceptor_ = function(context, proceed) {
  var name = this.name_;
  
  // Patch the response object.
  var res = context.get('response');
  var writeHead = res.writeHead;
  var end = res.end;
  
  res.writeHead = function(code, headers) {
    headers = headers || {};
    headers['Date'] = (new Date()).toGMTString();
    headers['X-Content-Type-Options'] = 'nosniff';
    headers['Server'] = name;
    writeHead.call(res, code, headers);
  };
  res.end = function() {
    end.apply(res, arguments);
    // Tell the interceptor chain to proceed once the response has been ended.
    proceed();
  };
  
  // Should not get here unless an action exists for this request, so no null
  // check is needed.
  var action = context.get('action');
  if (action.execute) {
    action.execute(context);
  } else {
    action(context);
  }
};


/**
 * Registers helpers that can be used to inject data from the request.
 * @private
 */
Server.prototype.registerProviders_ = function() { 
  var protocol = this.credentials_ ? 'https' : 'http';
 
  var context = this.getContext();  
  context.registerInstance('server', this);
  context.registerInstance('port', this.port_);
  context.registerInstance('host', this.host_);
  context.registerInstance('protocol', protocol);
  context.registerInstance('baseurl', protocol + '://' + this.host_ + ':' +
      this.port_);

  context.registerProvider(
      'query', Server.provideQueryParams_, Context.Scope.REQUEST);
  context.registerProvider(
      'postdata', Server.providePostData_, Context.Scope.REQUEST);
  context.registerProvider(
      'action-annotations', Server.provideAnnotations_, Context.Scope.REQUEST);
};


/**
 * Decodes the query params from a request and returns the object literal,
 * when registered as a request-scoped provider this allows decoding to be done
 * once per request.
 * @param {!Context} context
 * @return {Object}
 * @private
 */
Server.provideQueryParams_ = function(context) {
  return url.parse(context.get('request').url, true).query;
};


/**
 * Returns a "Future" whose callbacks will be executed when all the post data
 * has been received.  The callbacks will recieve a JS object containin the
 * decoded post data.  Post data is decoded based on the encoding type. 
 * @param {!Context} context
 * @return {Future}
 * @private
 */
Server.providePostData_ = function(context) {
  return new PostDataFuture(context).read();
};


/**
 * Provides a map of annotations for the action associated with the active
 * request.
 * @param {!Context} context
 * @return {Object}
 */
Server.provideAnnotations_ = function(context) {
  var action = context.get('action');
  return action.annotations || {};
};


/**
 * Throws an error if the server has already been started.
 * @private
 */
Server.prototype.assertNotStarted_ = function() {
  if (this.started_) {
    throw Error('Server has already been started.');
  }  
};
