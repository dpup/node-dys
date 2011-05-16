

module.exports = Template;


function Template(fileReader) {
  this.fileReader_ = fileReader;
}


Template.prototype.fetch = function(path, params, callback) {
  for (var i in params) {
    if (/[^a-zA-Z0-9\-_]/.test(i)) {
      throw Error('Invalid param name "' + i + '", must only contain a-zA-Z0-9\-_');
    }
  }
  
  var html = '';
  var stream = {
    write: function(data, enc) {
      if (data instanceof Buffer) {
        html += data.toString('utf8');
      } else if (enc == 'utf8') {
        html += data;
      } else {
        throw Error('Bad template encoding type');
      }
      return true;
    },
    end: function(data, enc) {
      if (data) {
        stream.write(data, enc);
      }
    },
    destroy: function() {},
    destroySoon: function() {}
  };
  this.fileReader_.pipeFile(path, {}, stream, function(err) {
    if (err) {
      callback(err, null);
    }
    for (var name in params) {
      var re = new RegExp('\\$\\{' + name + '\\}', 'g');
      html = html.replace(name, params[name]);
    }
    callback(null, html);
  }, this);
};
