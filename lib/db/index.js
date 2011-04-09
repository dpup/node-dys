/**
 * @fileoverview Public interface for the 'db' namespace.
 *
 * @author dan@pupi.us (Daniel Pupius)
 */

module.exports = {
  get MongoModule() {
    return require('./mongo/module');
  },  
};
