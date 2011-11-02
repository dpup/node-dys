/**
 * @fileoverview Public interface to dys framework components, avoids apps
 * needing to require() all the classes.
 *
 * @author dan@pupi.us (Daniel Pupius)
 */

var base = require('./base');

module.exports = {

  // TODO: remove, use dys.errors.exec
  exec: base.exec,

  // TODO: remove, use dys.errors.wrap
  wrap: base.wrap,

  get App() {
    return require('./app');
  },

  get Future() {
    return require('./future');
  },

  get Scope() {
    return require('./context').Scope;
  },

  get Server() {
    return require('./server');
  },

  get ActionModule() {
    return require('./actionmodule');
  },

  get CookieModule() {
    return require('./cookiemodule');
  },

  get RequestLogModule() {
    return require('./requestlog/module');
  },

  get StatsModule() {
    return require('./monitoring/statsmodule');
  },

  get StaticFileModule() {
    return require('./static/module');
  },

  get SimpleAction() {
    return require('./simpleaction');
  },

  get auth() {
    return require('./auth');
  },

  get db() {
    return require('./db');
  },

  get testing() {
    return require('./testing');
  },

  get util() {
    return require('./util');
  },

  get errors() {
    return require('./base');
  },

  get interceptors() {
    return require('./interceptors');
  }
};
