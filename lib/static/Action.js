/**
 * @fileoverview Action class used to serve static files.
 *
 * @author dan@pupi.us (Daniel Pupius)
 */

module.exports = Action;
 
var pathLib = require('path');
var base = require('../base');
var util = require('../util');
 

/**
 * @constructor
 */
function Action(ctx, basePath, fileReader, fileWriter, filter) {
  
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
   * Counter for how many files have been served.
   * @type {number}
   * @private
   */
  this.filesServed_ = 0;

  /**
   * Logger instance for the dispatcher.
   * @type {!Logger}
   * @private
   */
  this.logger_ = ctx.get('core.log').getLogger('StaticFileAction');
};


/**
 * Executes the action, called by dispatcher
 * @param {!Context} ctx The request scope's context.
 */
Action.prototype.execute = function(ctx) {
  var matches = ctx.get('core.matches');
  var path = pathLib.join(this.basePath_, matches['*'].join('/'));
  path = path.replace(/\.\./g, '');
  
  if (this.filter_ && !this.filter_.test(path)) {
    this.logger_.log('File access blocked by filter [' + path + ']');
    // Send 404 rather than 403 to mask presence of file.
    throw new base.NotFoundError();
  }
  
  this.fileReader_.stat(path, base.wrap(ctx, function(err, stat) {
    if (err) {
      this.logger_.log('Error reading file [' + path + ']: ' + err);
      throw new base.NotFoundError();
    } else if (!stat.isFile()) {
      this.logger_.log('Error reading file [' + path + ']: Not a file');
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
    if (err) throw err;
    this.filesServed_++;
    if (this.filesServed_ % 50 == 0) {
      this.logger_.log(this.filesServed_ + ' static files served');
    }
  }, this));
};
