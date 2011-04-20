/**
 * @fileoverview Module that provides authentication via HTTP Basic auth.
 *
 * @author dan@pupi.us (Daniel Pupius)
 */

module.exports = Module;

var AuthModule = require('./authmodule');
var base = require('../base');
var logging = require('logging');
var util = require('util');



/**
 * Constructs a new Module.
 * @param {string} realm.
 * @constructor
 */
function Module(realm) {
  Module.super_.call(this, realm);
  this.logger_ = logging.getLogger('dispatch.auth.BasicAuthModule');
}
util.inherits(Module, AuthModule);


/**
 * Returns the auth headers to send with a NotAuthorized response.
 * @param {!Context} ctx The request scoped context.
 */
Module.prototype.getAuthHeaders = function(ctx) {
  return {
    'WWW-Authenticate': 'Basic realm=' + this.realm
  };
};


/**
 * Provides the user that is authorized via Basic HTTP.
 * @param {!Context} ctx The request scoped context object.
 * @return {string?}
 */
Module.prototype.provideUser = function(ctx) {
  var req = ctx.get('request');
  // Try to authenticate.
  var auth = req.headers['authorization'];
  if (auth && /^Basic /.test(auth)) {
    var userPass = new Buffer(auth.substr(6), 'base64').toString('utf8').split(':');
    var user = userPass[0];
    var pass = userPass[1];
    if (this.getPassword(user) === pass) {
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
