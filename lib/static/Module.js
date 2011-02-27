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
 * @author dan@pupi.us (Daniel Pupius)
 */

module.exports = Module;

var fs = require('fs');
var Action = require('./Action');


/**
 * Constructs a new static file module.
 * @param {string} actionPath The URL path prefix where the static files should
 *    be served from, e.g. /images/*
 * @param {string} filePath The base filesystem path where the static files can
 *    be found, e.g. /home/dan/images
 * @param {Object} opt_options An optional object with additional configuration
 *    options for serving static files.  Can contain:
 *        filter: RegExp used to match valid paths, default allows all files,
 *        cacheLifetime: In seconds, default is one year.
 *        maxFiles: Max number of files that can be read at one time, should
 *            be based on OS limits.
 *        maxQueueSize: Max number of requests to queue up once maxFiles is
 *            reached.  After which it'll throw 500s.
 * @constructor
 */
function Module(actionPath, filePath, opt_options) {
  this.actionPath_ = actionPath;
  this.filePath_ = filePath;
  this.options_ = opt_options || {};
}


/**
 * Initializes the module, called from the Server.
 * @param {!Context} ctx The root context.
 */
Module.prototype.init = function(ctx) { 
 this.options_.mimes = this.loadMimeTypes_();
  ctx.get('core.dispatcher').addAction(
      this.actionPath_, new Action(ctx, this.filePath_, this.options_));
};


/**
 * Reads in the mimes.type file and creates a JS object mapping extension to
 * mime type.
 * @return {Object} Map of file extension to mime type.
 * @private
 */
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
