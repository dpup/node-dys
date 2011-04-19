/**
 * @fileoverview Module that provides authentication via HTTP Basic auth.
 *
 * 
 *
 * @author dan@pupi.us (Daniel Pupius)
 */

module.exports = Module;

var Context = require('../Context');
var base = require('../base');
var logging = require('logging');



/**
 * Constructs a new Module.
 * @param {string} realm.
 * @constructor
 */
function Module(realm) {
  this.realm_ = realm;
  this.logger_ = logging.getLogger('dispatch.auth.BasicAuthModule');
}


/**
 * Function that given a user returns their password, or null.
 * @type {function(string) : string?}
 * @private
 */
Module.prototype.passwordProvider_ = null;


/**
 * Function that determines whether the request requires authentication.
 * @type {function(!Context) : boolean}
 * @private
 */
Module.prototype.authFilter_ = null;


/**
 * @param {!Object} users Object containing usernames as keys, their passwords
 *     as values.
 * @return {!Module} This object for chaining.
 */
Module.prototype.withUserMap = function(users) {
  this.assertNoPasswordProvider_();
  this.passwordProvider_ = function(user) {
    return users[user] || null;
  };
  return this;
};


/**
 * Requires authorization for actions that are annotated with "require-auth".
 * @return {!Module} This object for chaining.
 */
Module.prototype.useAnnotation = function() {
  this.assertNoAuthFilter_();
  this.authFilter_ = function(ctx) {
    var action = ctx.get('action');
    return action.annotations
        && action.annotations.indexOf('require-auth') != -1;
  };
};


/**
 * Requires authorization for request URLs that match the regexp provided.
 * @param {RegExp} re
 * @return {!Module} This object for chaining.
 */
Module.prototype.useRegExpFilter = function(re) {
  this.assertNoAuthFilter_();
  this.authFilter_ = function(ctx) {
    return re.test(ctx.get('request').url);
  };
  return this;
};


Module.prototype.init = function(ctx) {
  ctx.registerProvider(
      'auth.user', this.provideUser_.bind(this), Context.Scope.REQUEST);
};


/**
 * @param {!Context} ctx
 */
Module.prototype.start = function(globalCtx) {
  if (!this.passwordProvider_) {
    throw Error('No password source specified for BasicAuthModule.');
  }
  globalCtx.get('server').addInterceptor(this.intercept_.bind(this));
};


/**
 * Intercepts a request and checks that it has valid authentication.
 * @param {!Context} ctx The request scoped context.
 * @param {Function} proceed Function to call to continue the chain.
 * @private
 */
Module.prototype.intercept_ = function(ctx, proceed) {
  var res = ctx.get('response');
  var user = ctx.get('auth.user');

  if (!user && this.authFilter_ && this.authFilter_(ctx)) {
    this.logger_.fine('Not yet authorized');
    throw new base.NotAuthorizedError({
      'WWW-Authenticate': 'Basic realm=' + this.realm_
    });
  } else {
    this.logger_.fine('No auth required');
    proceed();
  }
};


/**
 * Provides the user that is authorized via Basic HTTP.
 * @param {!Context} ctx The request scoped context object.
 * @erturn {string?}
 */
Module.prototype.provideUser_ = function(ctx) {
  var req = ctx.get('request');
  // Try to authenticate.
  var auth = req.headers['authorization'];
  if (auth && /^Basic /.test(auth)) {
    var userPass = new Buffer(auth.substr(6), 'base64').toString('utf8').split(':');
    var user = userPass[0];
    var pass = userPass[1];
    if (this.isValidUser_(user, pass)) {
      this.logger_.fine('User authorized as "' + user + '"');
      return user;
    } else {
      this.logger_.warn('Invalid username or password for "' + user + '"');
      throw new base.NotAuthorizedError({
        'WWW-Authenticate': 'Basic realm=' + this.realm_
      });
    }
  }  
  return null;
};


Module.prototype.isValidUser_ = function(user, pass) {
  return this.passwordProvider_(user) === pass;
};


Module.prototype.assertNoPasswordProvider_ = function() {
  if (this.passwordProvider_) {
    throw Error('A password source has already been configured for ' +
        'the BasicAuthModule.');
  }
};


Module.prototype.assertNoAuthFilter_ = function() {
  if (this.authFilter_) {
    throw Error('An auth filter has already been configured for the ' +
        'BasicAuthModule');
  }
};
