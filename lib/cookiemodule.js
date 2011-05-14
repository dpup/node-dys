/**
 * @fileoverview Module that adds functionality for setting/getting cookies.
 * 
 * @author dan@pupi.us (Daniel Pupius)
 */

module.exports = CookieModule;

var Context = require('./context');


function CookieModule() {}


CookieModule.prototype.init = function(rootCtx) {
  rootCtx.registerProvider('cookies', function(cxt) {
    return new CookieService(cxt);    
  }, Context.Scope.REQUEST);  
};



function CookieService(ctx) {
  this.req = ctx.get('request');
  this.res = ctx.get('response');
  this.parsedCookies_ = null;
}


CookieService.prototype.get = function(name, opt_default) {
  var cookies = this.parseCookies_();
  return cookies[name] || opt_default;
};


CookieService.prototype.set = function(name, value, options) {  
  if (options && options.secure && !this.res.socket.encrypted) {
    throw Error('Can not to set secure cookie on unencrypted socket.');
  }
  var cookies = this.res.getHeader('Set-Cookie') || [];
  if (typeof cookies == 'string') {
    cookies = [cookies];
  }
  cookies.push(new Cookie(name, value, options).toString());
  this.res.setHeader('Set-Cookie', cookies);
};


CookieService.prototype.parseCookies_ = function() {
  if (!this.parsedCookies_) {
    var cookies = this.parsedCookies_ = {};
    if (this.req.headers.cookie) {
      this.req.headers.cookie.split(';').forEach(function(cookie) {
        var parts = cookie.split('=');
        var name = parts[0].trim();
        // If multiple cookie's path match the client will send all of them. We
        // only consider the first, since it will be most specific. In the rare
        // case someone cares about all values, they can parse the header
        // themselves.
        if (!cookies[name]) {
          cookies[name] = (parts[1] || '').trim();
        }
      });
    }
  }
  return this.parsedCookies_;
};



function Cookie(name, value, options) {
  this.name = name;
  this.value = value;
  this.options = options || {};
}


Cookie.prototype.toString = function() {
  var str = this.name + '=' + this.value;
  if (this.options.maxAge) {
    str += '; expires=' + new Date(this.options.maxAge).toUTCString();
  }
  if (this.options.path) {
    str += '; path=' + this.options.path;
  }
  if (this.options.domain) {
    str += '; domain=' + this.options.domain;
  }
  if (this.options.secure) {
    str += '; secure';
  }
  if (this.options.httpOnly) {
    str += '; httponly';
  }
  return str;
};
