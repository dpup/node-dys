/**
 * @fileoverview Public interface to dispatch framework components, avoids apps
 * needing to require() all the classes.
 *
 * @author dan@pupi.us (Daniel Pupius)
 */


module.exports = {
  get Server() {
    return require('./server');
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
  }
};
