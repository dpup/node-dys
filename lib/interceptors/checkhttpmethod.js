/**
 * @fileoverview Interceptor function that enforces the HTTP method matches the
 * list provided by the active action.
 *
 * Actions should specify an array of HTTP methods in a "valid-methods" 
 * annotation.
 *
 * @author dan@pupi.us (Daniel Pupius)
 */

module.exports = function(ctx, proceed) {
  var method = ctx.get('request').method;
  var annotations = ctx.get('action-annotations');
  var validMethods = annotations['valid-methods'];
  if (validMethods && validMethods.indexOf(method) == -1) {
    var res = ctx.get('response');
    var allowed = validMethods.join(',');
    res.writeHead(405, {'Allow': allowed});
    res.end('Invalid method: ' + method + '; allowed: ' + allowed);
  } else {
    proceed();
  }
};
