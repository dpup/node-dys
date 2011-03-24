/**
 * @fileoverview Example : HTTPS
 *
 * You can generate a private key and certificate for testing by following these
 * steps (though the browser will complain):
 *
 * openssl genrsa -out privatekey.pem 1024 
 * openssl req -new -key privatekey.pem -out certrequest.csr 
 * openssl x509 -req -in certrequest.csr -signkey privatekey.pem -out certificate.pem
 *
 * @author dan@pupi.us (Daniel Pupius)
 */

var dispatch = require('dispatch');

new dispatch.Server(4105, '127.0.0.1').
    withCredentials(__dirname + '/privatekey.pem', __dirname + '/certificate.pem').
    addAction('/', function(ctx) {
      var req = ctx.get('request');
      var res = ctx.get('response');
      res.writeHead(200, {'Content-Type': 'text/plain'});
      res.end('done');
    }).
    start();
