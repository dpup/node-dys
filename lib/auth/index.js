/**
 * @fileoverview Public interface for the 'auth' namespace.
 *
 * @author dan@pupi.us (Daniel Pupius)
 */


module.exports = {
  get AuthModule() {
    return require('./authmodule');
  },

  get BasicAuthModule() {
    return require('./basicauthmodule');
  },
  
  get DigestAuthModule() {
    return require('./digestauthmodule');
  }
};
