/**
 * @fileoverview Example : Basic HTTP Auth
 *!
 * @author dan@pupi.us (Daniel Pupius)
 */

var dispatch = require('dispatch');

new dispatch.Server(4107, '127.0.0.1').
    addModule(new dispatch.RequestLogModule('/tmp')).
    addModule(new dispatch.StatsModule()).
    addModule(new dispatch.auth.BasicAuthModule('Basic Auth Test').
        // Provide a hardcoded set of usernam/password pairs.
        withUserMap({
          'dan': 'dan1234',
          'bob': 'bob4567',
          'bill': 'bill7890'
        }).
        // Only require auth for paths beginning with 'a'.
        useRegExpFilter(/\/a.*/)).
    // Add an action that will match any path.
    addAction('/*', function(ctx) {      
      var req = ctx.get('request');
      var res = ctx.get('response');
      var user = ctx.get('auth.user');
      res.writeHead(200, {'Content-Type': 'text/plain'});
      res.end('Request Url : ' + req.url + '\n' +
              'User : ' + (user || 'N/A'));
    }).
    start();
