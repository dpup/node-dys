/**
 * @fileoverview Abstract base module for other auth modules.
 *
 * @author dan@pupi.us (Daniel Pupius)
 */

module.exports = AuthModule;

var Context = require('../Context');
var base = require('../base');



/**
 * Constructs a new Module.
 * @param {string} realm.
 * @constructor
 */
function AuthModule(realm) {
  this.realm = realm;
}


/**
 * Function that given a user returns their password, or null.
 * @type {function(string) : string?}
 * @private
 */
AuthModule.prototype.passwordProvider_ = null;


/**
 * Function that determines whether the request requires authentication.
 * @type {function(!Context) : boolean}
 * @private
 */
AuthModule.prototype.authFilter_ = null;  


/**
 * @param {!Object} users Object containing usernames as keys, their passwords
 *     as values.
 * @return {!Module} This object for chaining.
 */
AuthModule.prototype.withUserMap = function(users) {
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
AuthModule.prototype.useAnnotation = function() {
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
AuthModule.prototype.useRegExpFilter = function(re) {
  this.assertNoAuthFilter_();
  this.authFilter_ = function(ctx) {
    return re.test(ctx.get('request').url);
  };
  return this;
};



/**
 * @param {!Context} ctx
 */
AuthModule.prototype.init = function(ctx) {
  ctx.registerProvider(
      'auth.user', this.provideUser.bind(this), Context.Scope.REQUEST);
};


/**
 * @param {!Context} ctx
 */
AuthModule.prototype.start = function(globalCtx) {
  if (!this.passwordProvider_) {
    throw Error('No password source specified for BasicAuthModule.');
  }
  globalCtx.get('server').addInterceptor(this.intercept.bind(this));
};




/**
 * Intercepts a request and checks that it has valid authentication.
 * @param {!Context} ctx The request scoped context.
 * @param {Function} proceed Function to call to continue the chain.
 * @private
 */
AuthModule.prototype.intercept = function(ctx, proceed) {
  var res = ctx.get('response');
  var user = ctx.get('auth.user');

  if (!user && this.authFilter_ && this.authFilter_(ctx)) {
    this.logger_.fine('Not yet authorized');
    throw new base.NotAuthorizedError(this.getAuthHeaders(ctx));
  } else {
    this.logger_.fine('No auth required');
    proceed();
  }
};


AuthModule.prototype.getPassword = function(user) {
  return this.passwordProvider_(user);
};


/**
 * Returns the auth headers to send with a NotAuthorized response.
 * @param {!Context} ctx The request scoped context.
 */
AuthModule.prototype.getAuthHeaders = function(ctx) {
  throw Error('Not implemented');
};


AuthModule.prototype.provideUser = function(ctx) {
  throw Error('Not implemented');
};


AuthModule.prototype.assertNoPasswordProvider_ = function() {
  if (this.passwordProvider_) {
    throw Error('A password source has already been configured for ' +
        'the BasicAuthModule.');
  }
};


AuthModule.prototype.assertNoAuthFilter_ = function() {
  if (this.authFilter_) {
    throw Error('An auth filter has already been configured for the ' +
        'BasicAuthModule');
  }
};
