
var dispatch = require('dispatch');

var o = {
  //filter: /\.(jpg|txt)$/ // only allow jpegs and text files.
};

dispatch.newServer(4101, '127.0.0.1').
    addModule(dispatch.newLoggingModule('/Users/pupius/Projects/mne.ma/logs')).
    addModule(dispatch.newStaticFileModule('images/*', '/Users/pupius/Pictures', o)).
    addAction('/', function(ctx) {
      var req = ctx.get('core.request');
      var res = ctx.get('core.response');
      res.writeHead(200, {'Content-Type': 'text/plain'});
      res.end('What what\n');
    }).
    addAction('/favicon.ico', function(ctx) {
      var res = ctx.get('core.response');
      res.writeHead(404, {'Content-Type': 'text/plain'});
      res.end('404 Not Found\n');      
    }).
    addAction('/error', function(ctx) {
      foobar();
    }).
    addAction('user/:name', function(ctx) {
      var res = ctx.get('core.response');
      var user = ctx.get('core.matches').name;
      res.writeHead(200, {'Content-Type': 'text/plain'});
      res.end('Hi ' + user + '\n');      
    }).
    start();
    