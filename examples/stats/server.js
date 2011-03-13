/**
 * @fileoverview Example : Stats and monitoring
 *
 * Simple example showing how the stats module can be used to monitor memory
 * usage. 
 *
 * @author dan@pupi.us (Daniel Pupius)
 */

var dispatch = require('dispatch');

new dispatch.Server(4102, '127.0.0.1').
    addModule(new dispatch.StatsModule()).
    addModule(new dispatch.StaticFileModule({
      // Disable browser caching and tell the module to only cache file for 2s,
      // this makes development easier.
      'cacheLifetime': 0, 'reStatTime': 2
    }).serveFile('/', __dirname + '/stats.html')).
    addAction('/favicon.ico', new dispatch.SimpleAction(404, '<h1>404 Not Found</h1>')).
    addAction('/dostuff', function(ctx) {
      var res = ctx.get('response');
      var dates = [];
      // Create a bunch of objects and avoid them being garbage collected
      // for 2 seconds.
      for (var i = 0; i < 100000; i++) {
        dates.push(new Date());
      }
      setTimeout(function() {
        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.end(JSON.stringify(dates));
      }, 3000);
    }).
    start();
