/**
 * @fileoverview Utility class for reading files without exceeding the OS
 * limits on how many files can be opened at once.
 *
 * @author dan@pupi.us (Daniel Pupius)
 */

module.exports = FileReader;

var fs = require('fs');
var util = require('util');


/**
 * Class used for reading and streaming files.  Limits the maximum number of
 * files open at one time, to avoid OS errors, e.g.
 *     Error: EMFILE, Too many open files
 *
 * @param {number} maxFiles The maximum number of files that can be open at one
 *    time.
 * @param {number} maxQueueLength The maximum number of reads we'll allow to
 *    queue up before starting to reject them.
 * @constructor
 */
function FileReader(maxFiles, maxQueueLength) {
  
  /**
   * The maximum number of files allowed open at one time.
   * @type {number}
   * @private
   */
  this.maxFiles_ = maxFiles;
  
  /**
   * The maximum length we'll allow the queue to get before throwing 500s.
   * @type {number}
   * @private
   */
  this.maxQueueLength_ = maxQueueLength;
  
  /**
   * The current open file count.
   * @type {number}
   * @private
   */
  this.openFiles_ = 0;
  
  /**
   * Queued files to read.
   * @type {Array.<Object>}
   * @private
   */
  this.queue_ = [];
  
  /**
   * Object used to cache the file contents and meta-data.
   *   Key is the path
   *   Value is an object containing:
   *      {number}  createTime
   *      {Object}  stat
   *      {boolean} hasContent
   *      {Buffer}  contents
   * @type {!Object}
   * @private
   */
  this.cache_ = {};
}


/**
 * Performs a file system stat request and returns the stats object to the
 * callback.
 * @param {string} path The file path to stat
 * @param {function(Object, Object)} callback Callback function that takes
 *    an error object and the stats.
 * @param {Object} scope Optional scope to call the callback in.
 */
FileReader.prototype.stat = function(path, callback, scope) {
  if (this.cache_[path]) {
    callback.call(scope, null, this.cache_[path].stat);
  } else {
    var me = this;
    fs.stat(path, function(err, stat) {
      // TODO: Does this make any sense?  To cache the stat without the actual
      // file?  Could lead to inconsistencies.
      // if (!err) {
      //   me.cache_[path] = {
      //     createTime: Date.now(),
      //     stat: stat,
      //     hasContent: false,
      //     contents: null
      //   };
      // }
      callback.call(scope, err, stat);
    });
  }
};


/**
 * Opens a read stream for the given file path and pipes it to the output
 * stream, pausing, if necessary, until the file reader has few enough open
 * files.
 * @param {string} path The path to the file to open.
 * @param {Object} options The FS Options object.
 * @param {WritableStream} stream A writable stream to output to.
 * @param {function(Object)} callback A callback for once the transfer is
 *    complete, takes an optional error object.
 */
FileReader.prototype.pipeFile = function(path, options, stream, callback) {
  // If the cache has content, then pipe it straight to the stream.
  if (this.cache_[path] && this.cache_[path].hasContent) {
    stream.end(this.cache_[path].contents);
    callback(null);
  
  // Else queue up a transfer.
  } else {
    this.stat(path, function(err, stat) {
      if (err) {
        callback(err);
        return;
      }
      var job = {
        path: path,
        stat: stat,
        options: options,
        outputStream: stream,
        callback: callback
      };
      if (this.openFiles_ < this.maxFiles_) {
        this.transfer_(job);
      } else if (this.queue_.length < this.maxQueueLength_) {
        this.queue_.push(job);
      } else {
        callback(new Error('FileReader queue limit exceeded, ' + 
            this.queue_.length + ' queued reads, ' +
            this.openFiles_ + ' open files.'));
      }
    }, this);
  }
};


FileReader.prototype.transfer_ = function(job) {
  this.openFiles_++;
  var me = this;
  var buffer = new Buffer(job.stat.size);
  var offset = 0;
  fs.createReadStream(job.path, job.options).on('data', function(chunk) {
    chunk.copy(buffer, offset);
    job.outputStream.write(chunk, 'binary');
    offset += chunk.length;
    
  }).on('close', function() {
    me.cache_[job.path] = {
      createTime: Date.now(),
      stat: job.stat,
      hasContent: true,
      contents: buffer
    };
    me.done_(job);
    
  }).on('error', function(err) {
    delete that.cache_[job.path];
    me.done_(job, err);
  });
};


FileReader.prototype.done_ = function(job, opt_err) {
  job.outputStream.end();
  job.callback(opt_err);
  this.openFiles_--;
  if (this.queue_.length > 0 && this.openFiles_ < this.maxFiles_) {
    this.transfer_(this.queue_.shift());
  }
};
