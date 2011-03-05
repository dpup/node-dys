/**
 * @fileoverview Random utilities, extends Node's util class for convenience of
 * namespacing.
 *
 * @author dan@pupi.us (Daniel Pupius)
 */

var util = module.exports = require('util');


/**
 * Copies the entries from one object to another, but only if they don't already
 * exist on the target object.
 * @param {!Object} src The object to copy from.
 * @param {!Object} target The object to copy to.
 * @param {string...} var_args Keys to optionally copy from src to target.
 */
util.optCopy = function(src, target, var_args) {
  Array.prototype.splice.call(arguments, 2).forEach(function(key) {
    target[key] = target[key] || src[key];
  });
};
 

/**
 * Returns a date string in the form yy/mm/dd hh:mm:ss.mmm.
 * @param {Date} d Optional date object to use, other wise creates a new one.
 * @return {string}
 */
util.getDateString = function(d) {
  d = d || new Date;
  return d.getFullYear() + '/' +
         pad(d.getMonth() + 1) + '/' +
         pad(d.getDate()) + ' ' +
         pad(d.getHours()) + ':' +
         pad(d.getMinutes()) + ':' + 
         pad(d.getSeconds()) + '.' +
         pad(d.getMilliseconds(), 3);
};


/**
 * Pads a number with leading zeros to ensure it is at least opt_len long.
 * @param {number} n The number to pad.
 * @param {number} opt_num The desired length to pad too, defaults to 2.
 * @return {string}
 */
var pad = util.pad = function(n, opt_len) {
  var len = opt_len || 2;
  n = String(n);
  return new Array(len - n.length + 1).join('0') + n;
};
