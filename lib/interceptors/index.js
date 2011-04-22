/**
 * @fileoverview dispatch.interceptors namespace.
 *
 * @author dan@pupi.us (Daniel Pupius)
 */

module.exports = {
  get checkHttpMethod() {
    return require('./checkhttpmethod');
  }
};
