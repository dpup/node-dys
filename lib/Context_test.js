/**
 * @fileoverview Unit tests for Context.js
 *
 * @author dan@pupi.us (Daniel Pupius)
 */

var Context = require('./Context');
var RootContext = Context.Root;

function createA() {
	return {'a': 1};
}

function createB() {
	return {'b': 2};
}

exports.testDefaultScope = function(test) {
	var c = new RootContext();
	c.registerProvider('a', createA);
	var a1 = c.get('a');
	var a2 = c.get('a');
	test.notEqual(a1, a2, 'Instances should be different');
	test.done();
};

exports.testRequestScope = function(test) {
	var c = new RootContext();
	c.registerProvider('a', createA, Context.Scope.REQUEST);

	var rc1 = new Context(c, Context.Scope.REQUEST);
	var a1 = rc1.get('a');
	var a2 = rc1.get('a');

	var rc2 = new Context(c, Context.Scope.REQUEST);
	var a3 = rc2.get('a');
	var a4 = rc2.get('a');
	
	test.equal(a1, a2, 'Instances 1 and 2 should be the same');
	test.equal(a3, a4, 'Instances 3 and 4 should be the same');
	test.notEqual(a2, a3, 'Instances 2 and 3 should be different');
	test.done();
};

exports.testSingletonScope = function(test) {
	var c = new RootContext();
	var rc = new Context(c, Context.Scope.REQUEST);

	c.registerProvider('a', createA, Context.Scope.SINGLETON);
	var a1 = c.get('a');
	var a2 = c.get('a');
	var a3 = rc.get('a');
	var a4 = rc.get('a');
	
	test.ok(a1 === a2 && a2 === a3 && a3 === a4, 'Should all be the same');
	test.done();
};

exports.testOutOfScope = function(test) {
	var c = new RootContext();
	c.registerProvider('a', createA, Context.Scope.REQUEST);
  test.throws(function() { var a = c.get('a'); });
  test.done();
};

exports.testSeeding = function(test) {
  var a = {};
  var c = new Context(new RootContext(), 'request');
  c.seed('a', a);
  test.equals(c.get('a'), a);
  test.done();
};