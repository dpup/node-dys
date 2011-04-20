/**
 * @fileoverview Module that provides authentication via Digest access
 * authentication.
 *
 * @author dan@pupi.us (Daniel Pupius)
 */

module.exports = Module;

var Context = require('../Context');
var base = require('../base');
var crypto = require('crypto');
var logging = require('logging');
var url = require('url');



/**
 * Constructs a new Module.
 * @param {string} realm.
 * @constructor
 */
function Module(realm) {
  this.realm_ = realm;
  this.logger_ = logging.getLogger('dispatch.auth.DigestAuthModule');
  this.nonces_ = {};
  this.nonceList_ = [];
  
  setInterval(this.expireOldNonces_.bind(this), 15000);
}


/**
 * Maximum number of nonces to keep in memory.  This avoids the client having
 * to do two requests for each resource.
 * @type {number}
 * @private
 */
var MAX_NONCE_CACHE_SIZE = 5000;


/**
 * Maximum amount of time a client can use a nonce before being needing to be
 * issued another one.
 * @type {number}
 * @private
 */
var MAX_NONCE_AGE = 30 * 1000;


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
 * Opaque data sent with the response.  On start up, will be set to an md5 of
 * the realm + the host + the port.
 * @type {string}                     
 * @private                           
 */                                   
Module.prototype.opaque_;


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
    return action.annotations &&
        action.annotations.indexOf('require-auth') != -1;
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
  this.opaque_ = md5(this.realm_, ctx.get('host'), ctx.get('port'));
  ctx.registerProvider(
      'auth.user', this.provideUser_.bind(this), Context.Scope.REQUEST);
};


/**
 * @param {!Context} ctx
 */
Module.prototype.start = function(globalCtx) {
  if (!this.passwordProvider_) {
    throw Error('No password source specified for DigestAuthModule.');
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
    this.throwNotAuthorizedError_(ctx);
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
  
  // There is an authorization field, so try to authenticate.  If it fails then
  // throw a 401 and ask the client to reauthenticate.
  var auth = req.headers['authorization'];
  
  if (auth && /^Digest /.test(auth)) {
    auth = auth.substr(7);
    
    // Extract the fields from the header.
    var fields = {};
    var re = /(\w+)=(?:(?:")([^"]+)"|([^\s,$]+))/g;
    var match;
    while (match = re.exec(auth)) {
      fields[match[1].toLowerCase()] = match[2] || match[3];
    }
    
    // Make sure we can handle the qop.
    if (fields['qop'] != 'auth') {
      this.logger_.warn('Unknown quality of protection.', fields);
      this.throwNotAuthorizedError_(ctx);
    }
    
    // Validate the opaque data matches.
    if (fields['opaque'] != this.opaque_) {
      this.logger_.warn('Invalid opaque data in auth header.', fields);
      this.throwNotAuthorizedError_(ctx);
    }
    
    var nonce = fields['nonce'];
    
    // Check that the nonce hasn't been expired.
    if (!(nonce in this.nonces_)) {
      this.logger_.warn('Invalid nonce.', fields);
      this.throwNotAuthorizedError_(ctx, true);       
    }

    // Check the count is in the correct order for the nonce.
    var nc = parseInt(fields['nc'], 16);
    if (nc <= this.nonces_[nonce]) {
      this.logger_.warn('Invalid nonce count.', fields);
      this.throwNotAuthorizedError_(ctx, true);          
    }
    this.nonces_[nonce].count = nc;
    
    // Check the username is valid.
    var user = fields['username'];
    var pass = this.passwordProvider_(user);
    
    if (pass == null) {
      this.logger_.warn('Unknown user', fields);
      this.throwNotAuthorizedError_(ctx);
    }
    
    // Validate the 'response' field and thus the password.
    var ha1 = md5(user, this.realm_, pass);
    var ha2 = md5(req.method, url.parse(req.url).pathname);
    var expectedResponse = md5(
        ha1, nonce, fields['nc'], fields['cnonce'], 'auth', ha2);
    
    if (fields['response'] != expectedResponse) {
      this.logger_.warn('Unexpected response value.', fields);
      this.throwNotAuthorizedError_(ctx);
    }
    
    // User is valid, so provide it.
    return user;
  }  
  return null;
};


Module.prototype.throwNotAuthorizedError_ = function(ctx, isStale) {
  throw new base.NotAuthorizedError({
    'WWW-Authenticate': 'Digest realm="' + this.realm_ + '",' + 
        'qop="auth",' + // Add auth-int?  Not very widely supported. 
        'nonce="' + this.getNonce_(ctx) + '",' +
        'opaque="' + this.opaque_ + '",' +
        'stale=' + (isStale ? 'TRUE' : 'FALSE')
  });
};


Module.prototype.getNonce_ = function(ctx) {
  // TODO : Use other factors such as IP.
  var nonce = md5(String(Math.random()));
  this.nonces_[nonce] = {count: 0, timestamp: Date.now()};
  this.nonceList_.push(nonce);
  
  // Clear out oldest entries first.
  while (this.nonceList_.length > MAX_NONCE_CACHE_SIZE) {
    delete this.nonces_[this.ninceList_.shift()];
  }
  
  return nonce;
};


Module.prototype.expireOldNonces_ = function() {
  var i = 0, now = Date.now();
  while (this.nonceList_.length > 0) {
    var n = this.nonceList_[i];
    if (this.nonces_[n].timestamp < now - MAX_NONCE_AGE) {
      this.logger_.fine('Expiring nonce:', n);
      delete this.nonces_[n];
      this.nonceList_.splice(i, 1);
    } else {
      // List is ordered by insert time, so just exit.
      break;
    }
    i++;
  }
};


Module.prototype.assertNoPasswordProvider_ = function() {
  if (this.passwordProvider_) {
    throw Error('A password source has already been configured for ' +
        'the DigestAuthModule.');
  }
};


Module.prototype.assertNoAuthFilter_ = function() {
  if (this.authFilter_) {
    throw Error('An auth filter has already been configured for the ' +
        'DigestAuthModule');
  }
};


function md5(str) {
  var hash = crypto.createHash('md5');
  hash.update(Array.prototype.join.call(arguments, ':'));
  return hash.digest('hex');
}
