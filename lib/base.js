
var util = require('util');

var logger = require('logging').getLogger('dispatch.errors');


exports.exec = function(ctx, callback, scope) {
  exports.wrap(ctx, callback, scope)();
};


exports.wrap = function(ctx, callback, scope) {
  var req = ctx.get('request', true);
  var res = ctx.get('response', true);
  return function() {
    try {
      callback.apply(scope, arguments); 
    } catch (e) {
      if (!req || !res) {
        logger.error('Error: ' + e.message);
        logger.error(e.stack);
      } else {
        // TODO : Check if any of the response has already been committed.    

        var headers = e.headers || {};
        headers['Content-Type'] = 'text/html';

        // Special case certain errors to be less noisy.
        if (e instanceof exports.NotFoundError ||
            e instanceof exports.NotAuthorizedError) {
          logger.info(req.method + ' ' + req.url + ' : ' + e.message);
          res.writeHead(e.httpStatus, headers);
          res.end('<h1>' + e.message + '</h1>');
          
        } else {
          logger.error(req.method + ' ' + req.url, e);
          res.writeHead(e.httpStatus || 500, headers);
          res.end('<h1>Server Error 500</h1><pre>' + 
              (typeof e == 'string' ? e : e.stack) + '</pre>');      
        }
      }
    }
  };
};


/**
 * Base class for custom errors, that ensures the stack is maintained.
 * @constructor
 */
exports.CustomError = function(message, httpStatus, headers) {
  this.message = message;
  this.httpStatus = httpStatus;
  this.headers = headers;
  this.stack = new Error(message).stack;
}
util.inherits(exports.CustomError, Error);


/**
 * @constructor
 */
exports.NotFoundError = function() {
  exports.CustomError.call(this, '404 Not Found', 404, null);
};
util.inherits(exports.NotFoundError, exports.CustomError);


/**
 * @constructor
 */
exports.NotAuthorizedError = function(headers) {
  exports.CustomError.call(this, '401 Not Authorized', 401, headers);
};
util.inherits(exports.NotAuthorizedError, exports.CustomError);