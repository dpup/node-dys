/**
 * @fileoverview Action class used to serve static files.
 *
 * @author dan@pupi.us (Daniel Pupius)
 */

module.exports = Action;
 
var base = require('../base');
var logging = require('logging');
var pathLib = require('path');
var util = require('../util');
 

/**
 * @constructor
 */
function Action(ctx, actionPath, basePath, fileReader, fileWriter, filter) {
  
  /**
   * The path this action is serving from.
   * @type {string}
   * @private
   */
  this.actionPath_ = actionPath;
  
  /**
   * The base path to use when resolving files.
   * @type {string}
   * @private
   */
  this.basePath_ = basePath;

  /**
   * FileReader instance used to limit how many concurrent file reads are
   * active.
   * @type {!FileReader}
   * @private
   */
  this.fileReader_ = fileReader;

  /**
   * Utility used to write the response.
   * @type {!FileWriter}
   * @private
   */
  this.fileWriter_ = fileWriter;
  
  /**
   * RegExp that files must match to be served.
   * @type {RegExp}
   * @private
   */
  this.filter_ = filter;

  /**
   * Number of incoming requests.
   * @type {number}
   * @private
   */
  this.requests_ = 0;
  
  /**
   * Counter for how many files have been served.
   * @type {number}
   * @private
   */
  this.filesServed_ = 0;
  
  /**
   * Counter for how 404s this action has served.
   * @type {number}
   * @private
   */
  this.notFound_ = 0;
  
  /**
   * Counter for how many requests for files that were blocked by the filter.
   * @type {number}
   * @private
   */
  this.accessDenied_ = 0;
  
  /**
   * Counter for number of errors when reading the file.
   * @type {number}
   * @private
   */
  this.error_ = 0;
  
  /**
   * Logger instance for the dispatcher.
   * @type {!Logger}
   * @private
   */
  this.logger_ = logging.getLogger('dys.static.Action');
  
  var stats = ctx.get('stats', /* optional */ true);
  if (stats) {
    stats.register('staticfileaction:' + actionPath, this.getStats_, this);
  }
};


/**
 * Executes the action, called by dispatcher
 * @param {!Context} ctx The request scope's context.
 */
Action.prototype.execute = function(ctx) {
  var matches = ctx.get('matches');
  var path = pathLib.join(this.basePath_, matches['*'].join('/'));
  path = path.replace(/\.\./g, '');
  
  this.requests_++;
  
  if (this.filter_ && !this.filter_.test(path)) {
    this.logger_.info('File access blocked by filter [' + path + ']');
    // Send 404 rather than 403 to mask presence of file.
    this.accessDenied_++;
    throw new base.NotFoundError();
  }
  
  this.fileReader_.stat(path, base.wrap(ctx, function(err, stat) {
    if (err) {
      this.logger_.warn('Error reading file [' + path + ']: ' + err);
      this.notFound_++;
      throw new base.NotFoundError();
    } else if (!stat.isFile()) {
      this.logger_.warn('Error reading file [' + path + ']: Not a file');
      this.notFound_++;
      throw new base.NotFoundError();
    } else {
      this.writeResponse_(ctx, path, stat);
    }
  }, this));  
};


/**
 * @param {!Context} ctx The context object.
 * @param {string} path The path of the file to serve on the local filesystem.
 * @param {Object} stats Anode.js file stats object.
 * @private
 */
Action.prototype.writeResponse_ = function(ctx, path, stat) {
  this.fileWriter_.write(ctx, path, stat, base.wrap(ctx, function(err) {
    if (err) {
      this.error_++;
      throw err;
    }
    this.filesServed_++;
  }, this));
};


/**
 * Returns stats about this action.
 * @return {!Object}
 * @private
 */
Action.prototype.getStats_ = function() {
  return {
    'requests': this.requests_,
    '200': this.filesServed_,
    '403': this.accessDenied_,
    '404': this.notFound_,
    '500': this.error_
  };
};
