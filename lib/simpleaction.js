/**
 * @fileoverview A simple action that simply returns a predefined status code
 * and content.  Content type will be text/html.
 *
 * @author dan@pupi.us (Daniel Pupius)
 */

module.exports = SimpleAction;

var util = require('./util');


/**
 * A class for simply dumping a string to the response with a predefined status
 * code.
 * @param {number} code HTTP Status code.
 * @param {string} content HTML content that gets written to the response.
 * @constructor
 */
function SimpleAction(code, content) {
  this.code_ = code;
  this.content_ = content;
}


SimpleAction.prototype.execute = function(ctx) {
  var res = ctx.get('response');
  res.writeHead(this.code_, {'Content-Type': 'text/html'});
  res.end(this.content_);
};


/**
 * Returns a new constructor with the predefined arguments.  This is useful
 * when you need to pass around constructors for lazy instantiation of the
 * action, e.g. inside an ActionModule.
 * @param {number} code HTTP Status code.
 * @param {string} content HTML content that gets written to the response.
 * @return {!Function} A constructor.
 */
SimpleAction.newSubClass = function(code, content) {
  function SubClass() {
    SimpleAction.call(this, code, content);
  }
  util.inherits(SubClass, SimpleAction);
  return SubClass;
};