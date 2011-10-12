/**
 * @fileoverview Provides a convenient mechanism for writing templated pages.
 *
 * @author dan@pupi.us (Daniel Pupius)
 */

module.exports = Page;


function Page(ctx) {
  this.res = ctx.get('response');
  this.template = ctx.get('static.template');
  this.templateFiles = [];
  this.templateParams = [];
}


Page.factory = function(ctx) {
  return new Page(ctx);
};


Page.prototype.contentType = 'text/html';


Page.prototype.withTemplate = function(file, params) {
  this.templateFiles.push(file);
  this.templateParams.push(params);
  return this;
};


Page.prototype.write = function() {
  this.res.writeHead(200, {'Content-Type': this.contentType});
  this.fetchTemplate_();
};


Page.prototype.fetchTemplate_ = function() {
  this.template.fetch(
      this.templateFiles.shift(),
      this.templateParams.shift(),
      this.writeTemplate_.bind(this));
};


Page.prototype.writeTemplate_ = function(err, html) {
  if (err) throw err;
  this.res.write(html + '\n');
  if (this.templateFiles.length > 0) this.fetchTemplate_();
  else this.res.end();  
};
