
var util = require('util');

var logger = require('logg').getLogger('dys.errors');


exports.exec = function(ctx, callback, scope) {
  exports.wrap(ctx, callback, scope)();
};


exports.wrap = function(ctx, callback, scope) {
  var req = ctx.get('request', true);
  var res = ctx.get('response', true);
  var callStack = new Error().stack;
  return function() {
    try {
      callback.apply(scope, arguments); 
    } catch (e) {
      if (!req || !res) {
        logger.error('Error in wrapped callback; Callback stack:',
            callStack, '\n\nError stack:', e.stack);
      } else {
        // TODO : Check if any of the response has already been committed.    

        var headers = e.headers || {};
        headers['Content-Type'] = 'text/html';

        var status = e.httpStatus || 500;
        var title = (HttpStatus[status] || 'Error') + ' ' + status;

        // Make errors less than 500 less noisy.
        if (status < 500) {
          logger.info(req.method + ' ' + req.url + ' : ' + e.message);
          res.writeHead(status, headers);
          res.end('<h1>' + title + '</h1><pre>' + e.message + '</pre>');
          
        } else {
          logger.error(req.method + ' ' + req.url, e);
          var status = e.httpStatus || 500;
          res.writeHead(status, headers);
          res.end('<h1>' + title + '</h1><pre>' + 
              (typeof e == 'string' ? e : e.stack) + '</pre>');      
        }
      }
    }
  };
};


var HttpStatus = exports.HttpStatus = {
  400: 'Bad Request',
  401: 'Not Authorized',
  402: 'Payment Required',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  406: 'Not Acceptable',
  407: 'Proxy Authentication Required',
  408: 'Request Timeout',
  409: 'Conflict',
  410: 'Gone',
  411: 'Length Required',
  412: 'Precondition Failed',
  413: 'Request Entity Too Large',
  414: 'Requst URI Too Long',
  415: 'Unsupported Media Type',
  416: 'Request Range Not Satisifed',
  417: 'Expectation Failed',
  
  500: 'Server Error',
  501: 'Not Implemented',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
  505: 'HTTP Version Not Supported'
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
exports.BadRequestError = function() {
  exports.CustomError.call(this, 'Bad Request', 400, null);
};
util.inherits(exports.BadRequestError, exports.CustomError);


/**
 * @constructor
 */
exports.NotFoundError = function() {
  exports.CustomError.call(this, 'Not Found', 404, null);
};
util.inherits(exports.NotFoundError, exports.CustomError);


/**
 * @constructor
 */
exports.NotAuthorizedError = function(headers) {
  exports.CustomError.call(this, 'Not Authorized', 401, headers);
};
util.inherits(exports.NotAuthorizedError, exports.CustomError);
