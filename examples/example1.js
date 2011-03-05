
var dispatch = require('dispatch');

dispatch.newServer(4101, '127.0.0.1').
    addModule(dispatch.newLoggingModule('/tmp/')).
    addModule(dispatch.newStaticFileModule().
        serveFiles('/images/*', '/Users/pupius/Pictures', {
          filter: /\.(jpg|gif|png)$/
        }).
        serveFile('/images/', '/Users/pupius/Pictures/index.html')).
    start();
