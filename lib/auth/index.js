

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
