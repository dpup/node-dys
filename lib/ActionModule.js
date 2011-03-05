/**
 * @fileoverview Base class for Modules that want to install actions.  Callers
 * should use addAction and then at server start-up all the actions will be
 * registered with the Dispatcher.
 *
 * Actions won't be constructed until startup and will be passed the application
 * context as their first argument.  Extra arguments can be specified when
 * calling addAction().
 * 
 * @author dan@pupi.us (Daniel Pupius)
 */

module.exports = ActionModule;

var util = require('./util');


/**
 * Base class for modules that want to add actions.
 * @constructor
 */
function ActionModule() {
  /**
   * Array of actions to register when the server starts up.
   * @type {Array}
   * @private
   */
  this.actions_ = [];
}


/**
 * Whether the server has started yet.
 * @type {boolean}
 * @private
 */
ActionModule.prototype.started_ = false;


/**
 * Adds an action to be registered on start-up.
 * @param {string} path The action path.
 * @param {Function} actionClass A constructor function for the action.
 * @param {Array.<*>} args Array of additional arguments to pass to the
 *     constructor, the context will always be the first arg.
 * @return {ActionModule} Self for chaining.
 */
ActionModule.prototype.addAction = function(path, actionClass, args) {
 if (this.started_) throw Error('Server already started');
  this.actions_.push({
    path: path,
    actionClass: actionClass,
    args: args || []
  });
};


/**
 * Adds all the static file actions to the dispatcher.
 * @param {!Context} ctx The root context.
 */
ActionModule.prototype.start = function(ctx) {
  var dispatcher = ctx.get('core.dispatcher');
  for (var i = 0; i < this.actions_.length; i++) {
    this.actions_[i].args.unshift(ctx);
    var action = this.createAction_(this.actions_[i]);
    dispatcher.addAction(this.actions_[i].path, action);
  }
  this.started_ = true;
};


ActionModule.prototype.createAction_ = function(info) {
  function TmpClass() {
    TmpClass.super_.apply(this, info.args);
  }
  util.inherits(TmpClass, info.actionClass);
  return new TmpClass();
};
