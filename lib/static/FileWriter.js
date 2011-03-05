/**
 * @fileoverview Utility class for writing out the response for a file.  It will
 * check the request for last modified or etag information and respond
 * accordingly.
 *
 * @author dan@pupi.us (Daniel Pupius)
 */

module.exports = FileWriter;

var crypto = require('crypto');


/**
 * @constructor
 */
function FileWriter(fileReader, mimes, cacheLifetime) { 
  this.fileReader_ = fileReader;
  this.mimes_ = mimes;
  this.cacheLifetime_ = cacheLifetime;
}


/**
 * Writes the suitable response for the file path to the response in the
 * provided RequestScope.  Handles Last-Modified, ETag and Range headers.
 *
 * @param {@Context} ctx The RequestScope's context object.
 * @param {string} path The file path to write.
 * @param {Object} stat The node stat object.
 * @param {function()} callback The function to callback _if_ the file is piped
 *    to the response.  Will not be called for 405s, 304s or HEAD requests.
 */
FileWriter.prototype.write = function(ctx, path, stat, callback) {  
  var req = ctx.get('core.request');
  var res = ctx.get('core.response');

  // Check the HTTP method.
  if (req.method != 'HEAD' && req.method != 'GET') {
    res.writeHead(405, {'Allow': 'GET, HEAD'});
    res.end();
    return;
  }

  // Apache style etag: path, inode, mtime and size. 
  var hash = crypto.createHash('md5');
  hash.update(path);
  hash.update(stat.ino);
  hash.update(stat.mtime);
  hash.update(stat.size);
  var etag = '"' + hash.digest('base64') + '"';

  var ifNoneMatch = req.headers['if-none-match'];
  var ifModifiedSince = req.headers['if-modified-since'];
  if (ifNoneMatch && ifNoneMatch.indexOf(etag) != -1 ||
      ifModifiedSince && stat.mtime <= Date.parse(ifModifiedSince)) {
    res.writeHead(304, {});
    res.end();

  } else {
    var code = 200;
    var ext = String(path.split('.').pop()).toLowerCase();

    var mimeType = this.mimes_[ext] || 'application/binary';
    var lifetime = this.cacheLifetime_ || 31536000;  // 1-year

    var headers = {
      'Last-Modified': (new Date(Date.parse(stat.mtime)).toGMTString()),
      'Expires': (new Date(Date.now() + lifetime * 1000)).toGMTString(),
      'Cache-Control': 'public, max-age=' + lifetime,
      'ETag' : etag,
      'Accept-Ranges': 'bytes',
      'Content-Type': mimeType,
      'Content-Length': stat.size
    };

    var fsOptions = {};
    var range = req.headers['range'] || req.headers['request-range'];
    if (range) {
      // TODO : Support full range spec per section 14.35.1 in
      // http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html
      var match = range.match(/bytes=(\d+)-(\d+)/);
      var from = parseInt(match[1], 10);
      var to = parseInt(match[2], 10);
      if (!isNaN(from) && !isNaN(to) &&
          from < to && from >= 0 && to < stat.size) {
        fsOptions.start = from;
        fsOptions.end = to;
        headers['Content-Length'] = to - from + 1;
        headers['Content-Range'] = from + '-' + to + '/' + stat.size;
        code = 206;
      } else {
        code = 416;
      }
    }

    res.writeHead(code, headers);

    if (req.method == 'HEAD') {
      res.end();
    } else {
      this.fileReader_.pipeFile(path, fsOptions, res, callback);
    }
  }
};
