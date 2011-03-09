/**
 * @fileoverview A simple action that simply returns a predefined status code
 * and content.  Content type will be text/html.
 *
 * @author dan@pupi.us (Daniel Pupius)
 */

module.exports = SimpleAction;

function SimpleAction(code, content) {
  this.code_ = code;
  this.content_ = content;
}

SimpleAction.prototype.execute = function(ctx) {
  var res = ctx.get('response');
  res.writeHead(this.code_, {'Content-Type': 'text/html'});
  res.end(this.content_);
};
