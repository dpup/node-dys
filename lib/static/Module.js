/**
 * @fileoverview A module that configures static file serving from a given
 * path.
 *
 * Static files will be heavily cached, by default expiry is 1 year.  You
 * should either change this by passing the options object or use versioned
 * filenames.
 *
 * There is support for the following HTTP features:
 *   If-None-Match/ETag,
 *   If-Last-Modified/Last-Modified
 *   Accept-Ranges/Request-Range/Content-Range
 *
 * Only GET and HEAD requests will be allowed.
 *
 * In order to avoid file system limits on the number of open files, transfers
 * may be queued.  There is also an in memory cache of files.  See the
 * constructor's JSDoc for details on how to configure these features.
 * 
 * @author dan@pupi.us (Daniel Pupius)
 */

module.exports = Module;

var fs = require('fs');
var util = require('../util');
var ActionModule = require('../ActionModule');
var Action = require('./Action');
var FileReader = require('./FileReader');


/**
 * Constructs a new static file module.
 *
 * @param {Object=} opt_options An optional object with configuration options
 *     for how this module will serve static files.  Can contain:
 *        maxFiles: Max number of files that can be read at one time, should
 *            be based on OS limits.
 *        maxQueueLength: Max number of requests to queue up once maxFiles is
 *            reached.  After which it'll throw 500s.
 *        maxCacheSize: The maximum size in bytes of the in memory file cache.
 *        reStatTime: How often (in ms) to check whether cached files are out of
 *            sync with the file system. Default is 30s.
 *        cacheLifetime: Default browser cache lifetime in seconds.  Actions
 *            may override this value in their own options object.
 *
 * @constructor
 */
function Module(opt_options) {
  Module.super_.call(this);
  
  /**
   * An object with configuration options for how this module will serve
   * static files.
   * @type {!Object}
   * @private
   */
  this.options_ = opt_options || {};
  this.options_.mimes = this.loadMimeTypes_();
  
  /**
   * FileReader instance used to limit how many concurrent file reads are
   * active.
   * @type {!FileReader}
   * @private
   */
  this.fileReader_ = new FileReader(this.options_);
}
util.inherits(Module, ActionModule);


/**
 * Sets up static file serving on the given action path.
 * 
 * e.g. If you call serveFiles('/images, /home/static-files) and the user
 * requests /images/foo/bar/baz.jpg then the server will try to serve
 * /home/static-files/foo/bar/baz.jpg
 *
 * @param {string} actionPath The URL path prefix where static files
 *    should be served from, e.g. /images
 * @param {string} filePath The base filesystem path where the static files can
 *    be found, e.g. /home/dan/static-files
 * @param {Object=} opt_options An optional object with additional configuration
 *    options for how this action will serve static files.  Can contain:
 *        filter: RegExp used to match valid paths, default allows all files,
 *        cacheLifetime: Browser cache lifetime in seconds, default is one year.
 *
 * @return {!Module} Self for chaining.
 */
Module.prototype.serveFiles = function(actionPath, filePath, opt_options) {
  var options = opt_options || {};
  util.optCopy(this.options_, options, 'mimes', 'cacheLifetime');

  this.addAction(this.canonicalizeActionPath_(actionPath), Action,
      [filePath, this.fileReader_, options]);
  
  return this;
};


Module.prototype.loadMimeTypes_ = function() {
  var mimes = {};
  var lines = fs.readFileSync(__dirname + '/mimes.type', 'UTF-8').split('\n');
  for (var line, i = 0; line = lines[i]; i++) {
    if (line[0] == '#') continue;
    var parts = line.split(/\s+/);
    for (var j = 1; j < parts.length; j++) {
      mimes[parts[j].toLowerCase()] = parts[0];
    }
  }
  return mimes;
};


Module.prototype.canonicalizeActionPath_ = function(path) {
  if (path.substr(-2) != '/*') {
    if (path.substr(-1) != '/') {
      path += '/';
    }
    path += '*'; 
  }
  return path;
};
