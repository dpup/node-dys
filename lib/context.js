/**
 * @fileoverview Exports a class that can be used to inject dependencies.
 *
 * The server defines 3 scopes where service providers can be registered.
 *   'default'   : A new instance is created for each call to get().
 *   'request'   : Only one instance is created per request.
 *   'singleton' : Only one instance is ever created.
 *
 * A scoped service can not be requested out of scope without accessing the
 * correct Context object associated with that scope.
 *
 * An application should create a single Root context and register all the
 * necessary service providers on it.
 *
 * @author dan@pupi.us (Daniel Pupius)
 */
 
module.exports = Context;
 
var util = require('util');



/**
 * @param {Context} parent The parent context.
 * @param {string} scope The scope's identifier.
 * @constructor
 */
function Context(parent, scope) {
  this.parent_ = parent;
  this.scope_ = scope;
  this.cache_ = {};
};


/**
 * Default scopes that providers can be registered for.
 * @enum {string}
 */
Context.Scope = {
  DEFAULT: 'default',
  REQUEST: 'request',
  SINGLETON: 'singleton'
};


/**
 * Gets the provider for the given service id, or throws if it doesn't exist.
 * @param {string} id The service id.
 * @param {boolean} optional If true, will return null instead of throwing an
 *     error if there is no provider bound for the service.
 * @return {Object} A provider object with provide and scope fields.
 */
Context.prototype.getProvider = function(id, optional) {
  return this.parent_.getProvider(id, optional);
};


/**
 * Gets an instance of the service identified by the given id.  The instance
 * will be scoped according to the provider configuration and the currently
 * active scopes.
 * @param {string} id The service's identifier.
 * @param {boolean} optional If true, get() will return null instead of
 *     throwing an error if there is no provider bound for the service.
 * @return {Object} An instance of the service.
 */
Context.prototype.get = function(id, optional) {
  if (this.cache_[id]) {
    return this.cache_[id]
  }
  var provider = this.getProvider(id, optional);
  if (provider && provider.scope == this.scope_) {
    return (this.cache_[id] = provider.provide.call(null, this));
  }
  return this.parent_.get(id, optional);
};


/**
 * @return {Context.Scope} The scope for this context object.
 */
Context.prototype.getScope = function() {
  return this.scope_;
};


/**
 * Seeds the current context's cache with the given instance.  This should
 * be used rarely!  It will also break any scoping rules for providers already
 * bound to the given id.
 * @param {string} id The service id.
 * @param {Object} instance The object to seed.
 */
Context.prototype.seed = function(id, instance) {
  this.cache_[id] = instance;
};



/**
 * A special context that can be used as the root, and handles the DEFAULT and
 * SINGLETON scopes.  Service providers can be registered with the root.
 * @constructor
 */
Context.Root = function() {
  this.providers_ = {};
  this.singletons_ = {};
};
util.inherits(Context.Root, Context);


/**
 * Registers an instance for the given identifier, this is essentially the same
 * as registering a singleton provider.
 * @param {string} id The service id.
 * @param {Object} instance The instance.
 */
Context.Root.prototype.registerInstance = function(id, instance) {
  this.registerProvider(
      id, function() { return instance; }, Context.Scope.SINGLETON);
  return instance;
};


/**
 * Registers a provider method for the given identifier.
 * @param {string} id The service id.
 * @param {function(Context) : Object} provider A function for returning the
 *    service instance.  Will be passed the current context.
 * @param {Context.Scope} opt_scope An optional scope for the provider.
 */
Context.Root.prototype.registerProvider = function(id, provider, opt_scope) {
  if (this.providers_[id]) {
    throw Error('Provider already registered for [' + id + ']');
  }
  this.providers_[id] = {
    provide: provider,
    scope: opt_scope || Context.Scope.DEFAULT
  };
};


/**
 * Gets the provider for the given service id, or throws if it doesn't exist.
 * @param {string} id The service id.
 * @param {boolean} optional If true, will return null instead of throwing an
 *     error if there is no provider bound for the service.
 * @return {Object} A provider object with provide and scope fields.
 */
Context.Root.prototype.getProvider = function(id, optional) {
  var provider = this.providers_[id];
  if (!provider && !optional) {
    throw Error('No provider for [' + id + ']');
  }
  return provider || null;
};


/**
 * Gets an instance of the service identified by the given id.  The instance
 * will be scoped according to the provider configuration and the currently
 * active scopes.
 * @param {string} id The service's identifier.
 * @param {boolean} optional If true, get() will return null instead of
 *     throwing an error if there is no provider bound for the service.
 * @return {Object} An instance of the service.
 */
Context.Root.prototype.get = function(id, optional) {
  var provider = this.getProvider(id, optional)
  if (!provider) return null;
  
  switch (provider.scope) {
    case Context.Scope.DEFAULT:
      // Provider is in the default scope, so just return a new instance each
      // time.
      return provider.provide.call(null, this);
  
    case Context.Scope.SINGLETON:
      // Return the singleton instance, creating a new one if necessary.
      return this.singletons_[id] ||
          (this.singletons_[id] = provider.provide.call(null, this));
    
    default:
      throw Error('Out of scope? Tried to access [' + id + '] for scope [' +
          provider.scope + ']');
  }
};


/**
 * Seeding isn't supported on the root context since it's meaning is
 * ambiguous and may override the default scope.
 */
Context.Root.prototype.seed = function(id, instance) {
  throw Error('Seeding not supported on root context, use registerInstance' +
      ' if you want to force a singleton.');
};
