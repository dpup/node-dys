/**
 * @fileoverview Example : Cookies.
 *
 * Demonstrates how to use the cookie functionality in dispatch.
 *
 * @author dan@pupi.us (Daniel Pupius)
 */

var dispatch = require('dispatch');

new dispatch.Server(4109, '127.0.0.1').
    addModule(new dispatch.RequestLogModule('/tmp')).
    addModule(new dispatch.StatsModule()).
    addModule(new dispatch.CookieModule()).
    addAction('/*', function(ctx) {
      var path = ctx.get('path');
      var req = ctx.get('request');
      var res = ctx.get('response');
      var cookies = ctx.get('cookies');
      
      
      var visits = cookies.get('visits', 0);
      visits++;
      cookies.set('visits', visits, {
        expires: Date.now() + 365 * 24 * 60 * 60,
        path: path
      });

      console.log('Request Headers', req.headers);
      console.log('Response Headers', res.getHeader('Set-Cookie'));
      
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.end('You have been to "' + path + '" ' + visits + ' times.');
      
    }).
    start();
