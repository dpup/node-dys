

var compressx = require('../../third_party/node-compress/compress');

exports.intercept = function(ctx, proceed) {
  var req = ctx.get('request');
  var res = ctx.get('response');
  
  if (req.headers['accept-encoding'] &&
      req.headers['accept-encoding'].indexOf('gzip') != -1) {
    var compress = require('../../third_party/node-compress/compress');
    
  } else {
    proceed();
  }
};