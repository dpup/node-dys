/**
 * @fileoverview Unit tests for statsservice.js
 *
 * @author dan@pupi.us (Daniel Pupius)
 */

var StatsService = require('./statsservice');

var util = require('../util');

exports.testDefaultStats = function(test) {
  var ss = new StatsService();
  var stats = ss.getStats();
  
  // Stupid sanity checks.
  test.ok('process' in stats);
  test.equal(process.getgid(), stats.process.gid);
  test.equal(process.pid, stats.process.pid);
  test.equal(process.version, stats.process.version);
  test.equal(process.platform, stats.process.platform);
  
  test.ok('memory' in stats);
  test.done();
};

exports.testRegistration = function(test) {
  var ss = new StatsService();
  ss.register('a', function() { return 'aaa'; });
  ss.register('b', function() { return 'bbb'; });
  ss.register('c', function() {
    return this.stats;
  }, {stats: 'ccc'});
  
  var stats = ss.getStats();
  test.equal('aaa', stats.a);
  test.equal('bbb', stats.b);
  test.equal('ccc', stats.c);
  
  test.done();
};

exports.testFiltering = function(test) {
  var ss = new StatsService();
  ss.register('one', function() { return 'one'; });
  ss.register('two', function() { return 'two'; });
  ss.register('three', function() { return 'three'; });

  var stats = ss.getStats('t.*');
  test.equal(undefined, stats.process);
  test.equal(undefined, stats.monitoring);
  test.equal(undefined, stats.one);
  test.equal('two', stats.two);
  test.equal('three', stats.three);
  
  test.done();
};

exports.testBadRegExp = function(test) {
  var ss = new StatsService();
  test.throws(function() {
    ss.getStats('*');
  });
  test.done();
};