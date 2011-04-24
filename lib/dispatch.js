/**
 * @fileoverview Public interface to dispatch framework components, avoids apps
 * needing to require() all the classes.
 *
 * @author dan@pupi.us (Daniel Pupius)
 */

var base = require('./base');

module.exports = {

  exec: base.exec,

  wrap: base.wrap,

  get App() {
    return require('./app');
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
    return require('./SimpleAction');
  },
  
  get auth() {
    return require('./auth');
  },
  
  get db() {
    return require('./db');
  },
  
  get interceptors() {
    return require('./interceptors');
  }
};
