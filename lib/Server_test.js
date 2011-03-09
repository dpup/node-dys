/**
 * @fileoverview Unit tests for Server.js
 *
 * @author dan@pupi.us (Daniel Pupius)
 */

var Dispatcher = require('./dispatcher');
var LogManager = require('./logmanager');
var Server = require('./server');


// Stub out the Dispatcher's start function so that it doesn't actually run
// the server.
Dispatcher.prototype.start = function() {
  this.started = true;
};


exports.testCoreServicesRegistered = function(test) {
  var s = new Server();
  var ctx = s.getContext();
  test.ok(ctx.get('dispatcher') instanceof Dispatcher);
  test.ok(ctx.get('log') instanceof LogManager);
  test.done();	
};

exports.testModules = function(test) {
	var m1 = {init: function(ctx) { this.ctx = ctx; }};
	var m2 = {n: 0, init: function(ctx) { this.ctx = ctx; },
	    start: function(ctx) { this.n++; }};
	var m3 = {};
	
	var s = new Server();
	var ctx = s.getContext();
	s.addModule(m1, m2, m3)
	s.start();
	test.strictEqual(m1.ctx, ctx, 'Contexts should be the same');
	test.strictEqual(m2.ctx, ctx, 'Contexts should be the same');
	test.strictEqual(m2.n, 1, 'Start should be called once');
	test.done();
};
