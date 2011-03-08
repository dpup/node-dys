/**
 * @fileoverview Utility class for reading files without exceeding the OS
 * limits on how many files can be opened at once.  Will also cache files in
 * memory.
 *
 * @author dan@pupi.us (Daniel Pupius)
 */

module.exports = FileReader;

var fs = require('fs');
var util = require('util');


/**
 * Class used for reading and streaming files.  Limits the maximum number of
 * files open at one time, to avoid OS errors such as:
 *    "Error: EMFILE, Too many open files"
 *
 * @param {{maxFiles: number,
 *          maxQueueLength: number,
 *          maxCacheSize: number,
 *          reStatTime: number,
 *        }} options Object containing options for how the FileReader should
 *     behave.
 * @constructor
 */
function FileReader(options) {
  
  /**
   * The maximum number of files allowed open at one time.
   * @type {number}
   * @private
   */
  this.maxFiles_ = options.maxFiles || 100;
  
  /**
   * The maximum length we'll allow the queue to get before throwing 500s.
   * @type {number}
   * @private
   */
  this.maxQueueLength_ = options.maxQueueLength || Infinity;
  
  /**
   * The maximum number of bytes to store in an in-memory cache.
   * @type {number}}
   * @private
   */
  this.maxCacheSize_ = options.maxCacheSize || 52428800;  // 50MB
  
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
   * Object used to cache the file contents and stat info.
   *   Key is the path
   *   Value is an object containing:
   *      {number}  createTime
   *      {Object}  stat
   *      {Buffer}  contents
   * @type {!Object}
   * @private
   */
  this.cache_ = {};
  
  /**
   * Array of cache keys for entries in the cache, sorted by age.
   *
   * Basically an inefficient LRU.  If performance becomes an issue this can
   * be easily fixed.
   *
   * @type {!Array.<string>}
   * @private
   */
  this.cachedPaths_ = [];

  /**
   * Cache of the cache-size, since it is expected that getCacheSize() may be
   * called by monitoring tools we don't want to recalculate each time.
   * @type {number}
   * @private
   */
  this.cacheSize_ = 0;
  
  // Schedule a re-stat of all files in the cache to see if they have changed
  // and should be removed.
  var reStatTime = options.reStatTime || 30;
  if (reStatTime > 0 && this.maxCacheSize_ > 0) {
    setInterval(this.checkCacheAges_.bind(this), reStatTime * 1000);    
  }
}


/**
 * Returns the number of files currently held in the cache.
 * @return {number}
 */
FileReader.prototype.getCacheCount = function() {
  return this.cachedPaths_.length;
};


/**
 * Returns the size of the cache in bytes.
 * @return {number}
 */
FileReader.prototype.getCacheSize = function() {
  return this.cacheSize_;
};


/**
 * Performs a file system stat request and returns the stats object to the
 * callback.
 * @param {string} path The file path to stat
 * @param {function(Object, Object)} callback Callback function that takes
 *    an error object and the stats.
 * @param {Object=} scope Optional scope to call the callback in.
 */
FileReader.prototype.stat = function(path, callback, scope) {
  if (this.cache_[path]) {
    callback.call(scope, null, this.cache_[path].stat);
  } else {
    var me = this;
    fs.stat(path, function(err, stat) {
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
 * @param {Object=} scope Optional scope to call the callback in.
 */
FileReader.prototype.pipeFile = function(path, options, stream, callback, scope) {
  // If file exists in the cache, then pipe it straight to the stream.
  if (this.cache_[path]) {
    stream.end(this.cache_[path].contents);
    this.updateCachedPaths_(path);
    callback.call(scope, null);
  
  // Else queue up a transfer.
  } else {
    var job = {
      path: path,
      options: options,
      outputStream: stream,
      callback: callback,
      scope: scope
    };
    if (this.openFiles_ < this.maxFiles_) {
      this.transfer_(job);
    } else if (this.queue_.length < this.maxQueueLength_) {
      this.queue_.push(job);
    } else {
      callback(scope, new Error('FileReader queue limit exceeded, ' + 
          this.queue_.length + ' queued reads, ' +
          this.openFiles_ + ' open files.'));
    }
  }
};


FileReader.prototype.transfer_ = function(job) {
  this.openFiles_++;
  var me = this;
  this.stat(job.path, function(err, stat) {
    if (err) {
      job.callback(job.scope, err);
      return;
    }
    var buffer = new Buffer(stat.size);
    var offset = 0;
    fs.createReadStream(job.path, job.options).on('data', function(chunk) {
      chunk.copy(buffer, offset);
      job.outputStream.write(chunk, 'binary');
      offset += chunk.length;
    
    }).on('close', function() {
      me.updateCachedPaths_(job.path);
      me.cacheSize_ += stat.size;
      me.cache_[job.path] = {
        createTime: Date.now(),
        stat: stat,
        contents: buffer
      };
      me.enforceCacheSize_();
      me.done_(job);
    
    }).on('error', function(err) {
      delete that.cache_[job.path];
      me.done_(job, err);
    });
  });  
};


FileReader.prototype.done_ = function(job, opt_err) {
  job.outputStream.end();
  job.callback(job.scope, opt_err);
  this.openFiles_--;
  if (this.queue_.length > 0 && this.openFiles_ < this.maxFiles_) {
    this.transfer_(this.queue_.shift());
  }
};


FileReader.prototype.enforceCacheSize_ = function() {
  while (this.cacheSize_ > this.maxCacheSize_) {
    var path = this.cachedPaths_.shift();
    this.cacheSize_ -= this.cache_[path].stat.size;
    delete this.cache_[path];
  }
};


FileReader.prototype.updateCachedPaths_ = function(path) {
  var index = this.cachedPaths_.indexOf(path);
  if (index != -1) {
    this.cachedPaths_.splice(index, 1);
  }
  this.cachedPaths_.push(path);
};


FileReader.prototype.checkCacheAges_ = function() {
  for (var i = 0; i < this.cachedPaths_.length; i++) {
    var path = this.cachedPaths_[i];
    // Use fs.stat directly to bypass our own cache.
    fs.stat(path, this.checkFileAge_.bind(this, path));
  }
};


FileReader.prototype.checkFileAge_ = function(path, err, stat) {
  var entry = this.cache_[path];
  // If there was an error, or the file changed then delete it from the cache.
  if (err || (entry && entry.stat.mtime.valueOf() != stat.mtime.valueOf())) {
    delete this.cache_[path];
    this.cachedPaths_.splice(this.cachedPaths_.indexOf(path), 1);
  }
};
