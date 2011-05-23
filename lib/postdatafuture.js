/**
 * @fileoverview A future class that will read the post data from the incoming
 * request and call #done() when the stream has finished. Should be called
 * before any data events have fired on the request.
 *
 * @author dan@pupi.us (Daniel Pupius)
 */

module.exports = PostDataFuture;

var base = require('./base');
var Future = require('./future');
var util = require('./util');
var qs = require('querystring');
var sys = require('sys');


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
        callback(new base.CustomError(
            'Unsupported content type: ' + contentType, 400))
    }
  });
  return this;
};


function handleJsonData(data, callback) {
  try {
    var postData = JSON.parse(data);
  } catch (e) {
    callback(new base.CustomError('Invaid JSON data: ' +
        sys.inspect(data), 400));
    return;
  }
  callback(null, postData);
}


function handleFormData(data, callback) {
  callback(null, qs.parse(data));
}
