

module.exports = {
  get BasicAuthModule() {
    return require('./basicauthmodule');
  },
  
  get DigestAuthModule() {
    return require('./digestauthmodule');
  }
};
