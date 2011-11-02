/**
 * @fileoverview Example : Basic HTTP Auth
 *!
 * @author dan@pupi.us (Daniel Pupius)
 */

var dys = require('dys');

new dys.Server(4108, '127.0.0.1').
    addModule(new dys.RequestLogModule('/tmp')).
    addModule(new dys.StatsModule()).
    addModule(new dys.auth.DigestAuthModule('Digest Auth Test Realm').
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
