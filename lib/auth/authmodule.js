/**
 * @fileoverview Abstract base module for the basic auth and digest auth
 * modules.
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
 * Function that determines whether the request requires authentication.
 * @type {function(!Context) : boolean}
 * @private
 */
AuthModule.prototype.authFilter_ = null;  


/**
 * Helper function that allows a map of user->passwords to be provided.
 * @param {!Object} users Object containing usernames as keys, their passwords
 *     as values.
 * @return {!AuthModule} This object for chaining.
 */
AuthModule.prototype.withUserMap = function(users) {
  this.getPassword = function(user) {
    return users[user] || null;
  };
  return this;
};


/**
 * Sets the transformation to use when comparing passwords provided by the 
 * client with those in the store.
 * @param {function(string) : string} fn Transformation function.
 * @return {!AuthModule} This object for chaining.
 */
AuthModule.prototype.usePasswordTransformFn = function(fn) {
  this.transformPassword = fn;
  return this;
};


/**
 * Returns the password for the given user.
 * @param {string} user.
 * @return {?string} The password, or null if there is no such user.
 */
AuthModule.prototype.getPassword = function(user) {
  return null;
};


/**
 * Performs any necessary transformation to the password before it is to be
 * used or compared. Use this, for example, if the passwords are stored in a
 * database with one way encryption.
 *
 * @param {string} pass The password provided by the user.
 * @return {string} The transformed password to be used for comparison.
 */
AuthModule.prototype.transformPassword = function(pass) {
  return pass;
};


/**
 * Requires authorization for actions that are annotated with "require-auth".
 * @return {!AuthModule} This object for chaining.
 */
AuthModule.prototype.useAnnotation = function() {
  this.assertNoAuthFilter_();
  this.authFilter_ = function(ctx) {
    var annotations = ctx.get('action-annotations');
    return !!annotations['require-auth'];
  };
};


/**
 * Requires authorization for request URLs that match the regexp provided.
 * @param {RegExp} re
 * @return {!AuthModule} This object for chaining.
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


/**
 * Returns the auth headers to send with a NotAuthorized response.
 * @param {!Context} ctx The request scoped context.
 * @return {!Object} Object containing a map of auth headers.
 */
AuthModule.prototype.getAuthHeaders = function(ctx) {
  return {};
};


/**
 * Tries to authenticate and provide the user based on the given context.
 * Should return null if no user can be identified.
 * @param {!Context} ctx
 * @return {string} The authenticated user's identifier.
 */
AuthModule.prototype.provideUser = function(ctx) {
  throw Error('Not implemented');
};


AuthModule.prototype.assertNoAuthFilter_ = function() {
  if (this.authFilter_) {
    throw Error('An auth filter has already been configured for the ' +
        'auth module');
  }
};
