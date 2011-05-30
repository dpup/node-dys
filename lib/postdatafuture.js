/**
 * @fileoverview A future class that will read the post data from the incoming
 * request and call #done() when the stream has finished. Should be called
 * before any data events have fired on the request.
 *
 * If the content-type of the request is "application/json" then JSON.parse will
 * be used on the post data.  If the content-type is
 * "application/x-www-form-urlencoded" then the data will be parsed using the 
 * 'querystring' module.  Otherwise the postdata is just returned as a string.
 *
 * @author dan@pupi.us (Daniel Pupius)
 */

module.exports = PostDataFuture;

var Future = require('./future');
var base = require('./base');
var logger = require('logging').getLogger('PostDataFuture');
var util = require('./util');
var qs = require('querystring');
var sys = require('sys');



/**
 * @param {!Context} ctx The request scope's context object.
 * @constructor
 */
function PostDataFuture(ctx) {
  Future.call(this);
  this.ctx_ = ctx;
}
util.inherits(PostDataFuture, Future);


/**
 * Initiates reading the post data from the request of the PostData and calls
 * #done() when the request stream is finished.
 * @return {!Future}
 */
PostDataFuture.prototype.read = function() {
  var req = this.ctx_.get('request');  
  var contentType = req.headers['content-type'] || '';
  var callback = base.wrap(this.ctx_, this.done, this);
  
  logger.info('Reading post data:', contentType);
  
  var data = '';
  req.setEncoding('utf8');
  req.on('data', function(chunk) {
    data += chunk;
  });
  req.on('end', function() {
    switch (contentType) {
      case 'application/x-www-form-urlencoded':
      case '':
        handleFormData(data, callback);
        break;
      case 'application/json':
        handleJsonData(data, callback);
        break;
      default:
        callback(null, data);
    }
  });
  return this;
};


function handleJsonData(data, callback) {
  try {
    var postData = JSON.parse(data);
  } catch (e) {
    logger.warn('Error parsing post data', e);
    callback(new base.CustomError('Invaid JSON data: ' +
        sys.inspect(data), 400));
    return;
  }
  callback(null, postData);
}


function handleFormData(data, callback) {
  callback(null, qs.parse(data));
}
