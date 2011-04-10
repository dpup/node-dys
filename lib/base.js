
var util = require('util');


exports.exec = function(ctx, callback, scope) {
  exports.wrap(ctx, callback, scope)();
};


exports.wrap = function(ctx, callback, scope) {
  var req = ctx.get('request', true);
  var res = ctx.get('response', true);
  var logger = ctx.get('log').getLogger('errors');
  return function() {
    try {
      callback.apply(scope, arguments); 
    } catch (e) {
      if (!req || !res) {
        console.error('Error: ' + e.message);
        console.error(e.stack);
      } else {
        // TODO : Check if any of the response has already been committed.    
        if (e instanceof exports.NotFoundError) {
          // Special case NotFoundErrors to be less noisy.
          logger.log(req.method + ' ' + req.url + ' : ' + e.message);
          res.writeHead(e.httpStatus, {'Content-Type': 'text/html'});
          res.end('<h1>' + e.message + '</h1>');
        } else {
          logger.log(req.method + ' ' + req.url, e);
          res.writeHead(e.httpStatus || 500, {'Content-Type': 'text/html'});
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
exports.CustomError = function(message, httpStatus) {
  this.message = message;
  this.httpStatus = httpStatus;
  this.stack = new Error(message).stack;
}
util.inherits(exports.CustomError, Error);


/**
 * @constructor
 */
exports.NotFoundError = function() {
  exports.CustomError.call(this, '404 Not Found', 404);
};
util.inherits(exports.NotFoundError, exports.CustomError);