/**
 * @fileoverview Very simple templating system that uses the static file
 * module's filereader to load and cache the template files.  Simple parameter
 * subsitution is done via regexps.
 *
 * @author dan@pupi.us (Daniel Pupius)
 */

module.exports = Template;

var moustache = require('./moustache');


/** @constructor */
function Template(fileReader) {
  this.fileReader_ = fileReader;
}


/**
 * @param {string} path Path to the template file.
 * @param {Object} params Object containing key-value pairs, where the ${key}
 *    in the template will be subsituted for value.
 * @param {function(Error, string)} callback Function that will be called with
 *    an error or the HTML string.
 */
Template.prototype.fetch = function(path, params, callback) {
  var html = '';
  var stream = {
    write: function(data, enc) {
      if (data instanceof Buffer) html += data.toString('utf8');
      else if (enc == 'utf8') html += data;
      else throw Error('Bad template encoding type');
      return true;
    },
    end: function(data, enc) {
      if (data) stream.write(data, enc);
    },
    destroy: function() {},
    destroySoon: function() {}
  };
  
  this.fileReader_.pipeFile(path, {}, stream, function(err) {
    if (err) callback(err, null);
    else callback(null, moustache.to_html(html, params));
  }, this);
};
