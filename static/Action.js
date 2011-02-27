/**
 * @fileoverview Action class used to serve static files.
 *
 * @author dan@pupi.us (Daniel Pupius)
 */

module.exports = Action;
 
var mne = require('../../framework');
var FileReader = require('../FileReader');
var crypto = require('crypto');
var fs = require('fs');
var util = require('util');
 

/**
 * @constructor
 */
function Action(ctx, basePath, options) {
  
  /**
   * The base path to use when resolving files.
   * @type {string}
   * @private
   */
  this.basePath_ = basePath;
  
  /**
   * Object specifying options for how the Action should serve static files.
   * @type {Object}
   * @private
   */
  this.options_ = options;
  
  /**
   * Logger instance for the dispatcher.
   * @type {!Logger}
   * @private
   */
  this.logger_ = ctx.get('core.log').getLogger('StaticFileAction');
  
  /**
   * FileReader instance used to limit how many concurrent file reads are
   * active.
   * @type {!FileReader}
   * @private
   */
  this.fileReader_ = new FileReader(
      options.maxFiles || 20,
      options.maxQueueSize || 200);
  
  /**
   * Counter for how many files have been served.
   * @type {number}
   * @private
   */
  this.filesServed_ = 0;
};


/**
 * Executes the action, called by dispatcher
 * @param {!Context} ctx The request scope's context.
 */
Action.prototype.execute = function(ctx) {
  var matches = ctx.get('core.matches');
  var path = this.basePath_ + '/' + matches['*'].join('/');
  path = path.replace(/\.\./g, '');
  
  if (this.options_.filter && !this.options_.filter.test(path)) {
    this.logger_.log('File access blocked by filter [' + path + ']');
    // Send 404 rather than 403 to mask presence of file.
    throw new mne.NotFoundError();
  }
  
  this.fileReader_.stat(path, mne.wrap(ctx, function(err, stats) {
    if (err) {
      this.logger_.log('Error reading file [' + path + ']: ' + err);
      throw new mne.NotFoundError();
    } else if (!stats.isFile()) {
      this.logger_.log('Error reading file [' + path + ']: Not a file');
      throw new mne.NotFoundError();
    } else {
      this.writeResponse_(ctx, stats, path);
    }
  }, this));  
};


/**
 * @param {!Context} ctx The context object.
 * @param {Object} stats Anode.js file stats object.
 * @param {string} path The path of the file to serve on the local filesystem.
 * @private
 */
Action.prototype.writeResponse_ = function(ctx, stats, path) {  
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
  hash.update(stats.ino);
  hash.update(stats.mtime);
  hash.update(stats.size);
  var etag = '"' + hash.digest('base64') + '"';
  
  var ifNoneMatch = req.headers['if-none-match'];
  var ifModifiedSince = req.headers['if-modified-since'];
  if (ifNoneMatch && ifNoneMatch.indexOf(etag) != -1 ||
      ifModifiedSince && stats.mtime <= Date.parse(ifModifiedSince)) {
    res.writeHead(304, {});
    res.end();
    
  } else {
    var code = 200;
    var ext = String(path.split('.').pop()).toLowerCase();
    
    var o = this.options_;
    var mimeType = o.mimes[ext] || 'application/binary';
    var lifetime = o.cacheLifetime || 31536000;  // 1-year
    
    var headers = {
      'Last-Modified': (new Date(Date.parse(stats.mtime)).toGMTString()),
      'Expires': (new Date(Date.now() + lifetime * 1000)).toGMTString(),
      'Cache-Control': 'public, max-age=' + lifetime,
      'ETag' : etag,
      'Accept-Ranges': 'bytes',
      'Content-Type': mimeType,
      'Content-Length': stats.size
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
          from < to && from >= 0 && to < stats.size) {
        fsOptions.start = from;
        fsOptions.end = to;
        headers['Content-Length'] = to - from + 1;
        headers['Content-Range'] = from + '-' + to + '/' + stats.size;
        code = 206;
      } else {
        this.logger_.log('Bad range [' + range + '] sending whole file');
        code = 416;
      }
    }
  
    res.writeHead(code, headers);
  
    if (req.method == 'HEAD') {
      res.end();
    } else {
      this.fileReader_.pipeFile(path, fsOptions, res, mne.wrap(ctx, function(err) {
        if (err) throw err;
        this.filesServed_++;
        if (this.filesServed_ % 50 == 0) {
          this.logger_.log(this.filesServed_ + ' static files served');
        }
      }, this));
    }
  }
};
