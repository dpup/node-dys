/**
 * @fileoverview Unit tests for Server.js
 *
 * TODO: Some of this should be moved to app_test.js
 *
 * @author dan@pupi.us (Daniel Pupius)
 */

var flags = require('flags');
var LogManager = require('./logmanager');
var Server = require('./server');

var http = require('http');
var https = require('https');

// TODO: validate the server set up.
http.createServer = https.createServer = function() {
  return {
    listen: function() {}
  }
};

// Hack out flags
flags.parse = function() {};


exports.testCoreServicesRegistered = function(test) {
  var s = new Server();
  var ctx = s.getContext();
  test.ok(ctx.get('server') instanceof Server);
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

exports.testAsyncModules = function(test) {
  var m1 = {
    start: function(ctx, next) {
      m1.next = next;
      // should not wait.
    }
  };

  var m2 = {
    start: function(ctx, next) {
      m2.next = next;
      return true;
    }
  };
  
  var m3 = {
    start: function(ctx, next) {
      m3.next = next;
      return true;
    }
  };
  
	var s = new Server();
	s.addModule(m1, m2, m3)
	var done = false;
  s.start(function() { done = true; });
  
  // m1 should be started and not waited for, m2 should be started and paused.
  test.ok(!!m1.next);
  test.ok(!!m2.next);
  test.strictEqual(m3.next, undefined);
  test.ok(!done);
  
  m2.next();
  
  test.ok(!!m3.next);
  test.ok(!done);

  m3.next();

  test.ok(done);
  
  test.done();  
};
