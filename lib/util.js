


exports.getDateString = function(d) {
  d = d || new Date;
  return d.getFullYear() + '/' +
         pad(d.getMonth() + 1) + '/' +
         pad(d.getDate()) + ' ' +
         pad(d.getHours()) + ':' +
         pad(d.getMinutes()) + ':' + 
         pad(d.getSeconds()) + '.' +
         pad(d.getMilliseconds(), 3);
};


var pad = exports.pad = function(n, opt_len) {
  var len = opt_len || 2;
  n = String(n);
  return new Array(len - n.length + 1).join('0') + n;
};


/**
 * Copies the entries from one object to another, but only if they don't already
 * exist on the target object.
 * @param {!Object} src The object to copy from.
 * @param {!Object} target The object to copy to.
 * @param {string...} var_args Keys to optionally copy from src to target.
 */
exports.optCopy = function(src, target, var_args) {
  Array.prototype.splice.call(arguments, 2).forEach(function(key) {
    target[key] = target[key] || src[key];
  });
};