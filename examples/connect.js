/**
 * @fileoverview Example : Using 'connect' middleware.
 *
 * This example requires that 'connect' be installed and accessible via the
 * node package management system.
 *
 * i.e. npm install connect
 *
 * @author dan@pupi.us (Daniel Pupius)
 */

var dys = require('dys');
var connect = require('connect');

new dys.Server(4103, '127.0.0.1').
    // Adds a response time header.  curl -I http://localhost:4103
    addConnectMiddleware(connect.responseTime()).
    
    // Logs each request to the console.  See dys.RequestLogModule for
    // a utility that logs to a file rather than spamming the console.
    addConnectMiddleware(connect.logger()).
    
    // Serves a favicon, but as noted below has limitations with 'dys'.
    addConnectMiddleware(connect.favicon()).
    
    // Add a simple action that serves at the root. 
    addAction('/', new dys.SimpleAction(200, '<h1>Connect Test</h1>')).
    
    // Currently, interceptors are only run for paths that match an existing
    // action, this has some nice properties, but is in contrast to the connect
    // model so may need changing.
    // For now we need to register a catch all action and manually 404 if an
    // interceptor doesn't handle the request.
    addAction('/*', new dys.SimpleAction(404, '<h1>Not Found</h1>')).
    
    // Start up the server.
    start();
