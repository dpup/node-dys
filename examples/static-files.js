/**
 * @fileoverview Example : Static file serving.
 *
 * Sets up static file serving for the images directory, and adds an landing
 * page that matches the root.
 *
 *  - Request logs will be written to /tmp/.
 *  - Browser cache is set to a very short duration (5s) for testing.
 *  - In memory cache checks whether entries need to be expired every 2s.
 *  - Adds a simple action for the favicon to avoid spamming the console with a
 *    file that is known to not exist. 
 *
 * @author dan@pupi.us (Daniel Pupius)
 */

var dispatch = require('dispatch');

new dispatch.Server(4101, '127.0.0.1').
    addModule(new dispatch.RequestLogModule('/tmp')).
    addModule(new dispatch.StatsModule()).
    addModule(new dispatch.StaticFileModule({reStatTime: 2}).
        serveFiles('/images/*', __dirname + '/images', {
          // Only allow certain image files.
          filter: /\.(jpg|gif|png)$/,
          
          // Tell the browser to cache files for just 5 seconds.
          cacheLifetime: 5,
        }).
        serveFile('/', __dirname + '/images/ada.html')).
    addAction('/favicon.ico', new dispatch.SimpleAction(404, '<h1>404 Not Found</h1>')).
    start();
