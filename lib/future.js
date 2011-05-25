/**
 * @fileoverview Basic implementation of a Future.  Callbacks will be executed
 * synchronously if there is already a result, otherwise they'll be called when
 * #done() is called.
 *
 * @author dan@pupi.us (Daniel Pupius)
 */

module.exports = Future;


/**
 * @constructor
 */
function Future() {
  this.result_ = null;
  this.callbacks_ = [];
}


/**
 * Adds a callback to the future.
 * @param {function(Error, Object)} fn Function to execute when a result is
 *    a result is available.
 * @param {Object} scope Object whose scope to execute the callback.
 */
Future.prototype.addCallback = function(fn, scope) {
  if (this.result_ != null) {
    fn.apply(scope, this.result_);
  } else {
    this.callbacks_.push([fn, scope]);
  }
};


/**
 * Returns true if a result is available.
 * @return {boolean}
 */
Future.prototype.hasResult = function() {
  return !!this.result_;
};


/**
 * Sets the Future as done and executes the callbacks with the provided error or
 * result object.
 * @param {Error} err Optional error that occurred.
 * @param {Object} obj The value.
 */
Future.prototype.done = function(err, obj) {
  this.result_ = [err, obj];
  this.callbacks_.forEach(function(callback) {
    callback[0].call(callback[1], err, obj);
  });
};
