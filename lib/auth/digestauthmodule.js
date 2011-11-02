/**
 * @fileoverview Module that provides authentication via Digest access
 * authentication.
 *
 * @author dan@pupi.us (Daniel Pupius)
 */

module.exports = Module;

var AuthModule = require('./authmodule');
var base = require('../base');
var crypto = require('crypto');
var logg = require('logg');
var url = require('url');
var util = require('util');



/**
 * Constructs a new Module.
 * @param {string} realm.
 * @constructor
 */
function Module(realm) {
  Module.super_.call(this, realm);
  this.logger_ = logg.getLogger('dys.auth.DigestAuthModule');
  this.nonces_ = {};
  this.nonceList_ = [];
  
  setInterval(this.expireOldNonces_.bind(this), 15000);
}
util.inherits(Module, AuthModule);


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
var MAX_NONCE_AGE = 2 * 60 * 1000;  // 2-minutes


/**                                   
 * Opaque data sent with the response.  On start up, will be set to an md5 of
 * the realm + the host + the port.
 * @type {string}                     
 * @private                           
 */                                   
Module.prototype.opaque_;


Module.prototype.init = function(ctx) {
  Module.super_.prototype.init.call(this, ctx);
  this.opaque_ = md5(this.realm, ctx.get('host'), ctx.get('port'));
};


/**
 * Returns the auth headers to send with a NotAuthorized response.
 * @param {!Context} ctx The request scoped context.
 * @param {boolean=} opt_isStale Whether to set the stale bit.
 */
Module.prototype.getAuthHeaders = function(ctx, opt_isStale) {
  return {
    'WWW-Authenticate': 'Digest realm="' + this.realm + '",' + 
        'qop="auth",' + // Add auth-int?  Not very widely supported. 
        'nonce="' + this.getNonce_(ctx) + '",' +
        'opaque="' + this.opaque_ + '",' +
        'stale=' + (opt_isStale ? 'TRUE' : 'FALSE')
  };
};


Module.prototype.transformPassword = function(pass) {
  throw Error('Should not be used for digest auth, need access to plain ' +
      'text password inorder to calculate HA1.')
};


/**
 * Provides the user that is authorized via Basic HTTP.
 * @param {!Context} ctx The request scoped context object.
 * @return {string?}
 */
Module.prototype.provideUser = function(ctx) {
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
    var pass = this.getPassword(user);
    
    if (pass == null) {
      this.logger_.warn('Unknown user', fields);
      this.throwNotAuthorizedError_(ctx);
    }
    
    // Validate the 'response' field and thus the password.
    var ha1 = md5(user, this.realm, pass);
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


Module.prototype.getNonce_ = function(ctx) {
  var req = ctx.get('request');
  var nonce = md5(Date.now(), String(Math.random()), req.remoteAddress);
  this.nonces_[nonce] = {count: 0, timestamp: Date.now()};
  this.nonceList_.push(nonce);
  
  // Clear out oldest entries first.
  while (this.nonceList_.length > MAX_NONCE_CACHE_SIZE) {
    delete this.nonces_[this.ninceList_.shift()];
  }
  
  return nonce;
};


Module.prototype.expireOldNonces_ = function() {
  var now = Date.now();
  while (this.nonceList_.length > 0) {
    var n = this.nonceList_[0];
    if (this.nonces_[n].timestamp < now - MAX_NONCE_AGE) {
      this.logger_.fine('Expiring nonce:', n);
      delete this.nonces_[n];
      this.nonceList_.shift();
    } else {
      // List is ordered by insert time, so just exit.
      break;
    }
  }
};


Module.prototype.throwNotAuthorizedError_ = function(ctx, isStale) {
  throw new base.NotAuthorizedError(this.getAuthHeaders(ctx, isStale));
};


function md5(str) {
  var hash = crypto.createHash('md5');
  hash.update(Array.prototype.join.call(arguments, ':'));
  return hash.digest('hex');
}
