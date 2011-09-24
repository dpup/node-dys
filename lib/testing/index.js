/**
 * @fileoverview Public interface for the 'testing' namespace.
 *
 * @author dan@pupi.us (Daniel Pupius)
 */

module.exports = {
  get MockPostData() {
    return require('./postdata');
  },

  get FakeResponse() {
    return require('./response');
  }
};
