/**
 * @fileoverview Action class used to serve static files.
 *
 * @author dan@pupi.us (Daniel Pupius)
 */

module.exports = SingleFileAction;
 
var base = require('../base');
 

/**
 * @constructor
 */
function SingleFileAction(ctx, filePath, fileReader, fileWriter) {
  
  /**
   * The path of the file to serve.
   * @type {string}
   * @private
   */
  this.filePath_ = filePath;

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
};


/**
 * Executes the action, called by dispatcher.
 * @param {!Context} ctx The request scope's context.
 */
SingleFileAction.prototype.execute = function(ctx) {
  this.fileReader_.stat(this.filePath_, base.wrap(ctx, function(err, stat) {
    // Throw an actual error rather than a 404 since this action is only
    // meant to serve this one file, if it doesn't exist that is quite bad...
    if (err) throw err;
    this.fileWriter_.write(ctx, this.filePath_, stat, base.wrap(ctx, function(err) {
      if (err) throw err;
    }, this));
  }, this));
};
