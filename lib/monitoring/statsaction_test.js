/**
 * @fileoverview Unit tests for statsaction.js
 *
 * @author dan@pupi.us (Daniel Pupius)
 */

var StatsAction = require('./statsaction');


var fakeStats = {
  getStats: function() {
    return {
      'flat': 'just a string',
      'object': {
        'one': 111,
        'two': 222,
        'three': 333
      },
      'more': {
        'foo': 'bar'
      }
    };
  }
};

var fakeResponse = {
  writeHead: function(code, headers) {
    this.code = code;
    this.headers = headers;
  },
  end: function(str) {
    this.str = str;
  },
  reset: function() {
    delete this.code;
    delete this.headers;
    delete this.str;
  }
};

var fakeQuery;

var fakeContext = {
  get: function(key) {
    switch (key) {
      case 'stats': return fakeStats;
      case 'query': return fakeQuery;
      case 'response': return fakeResponse;
      default: throw Error('No fake for "' + key + '"');
    }
  }
};

function setUp() {
  fakeQuery = {};
  fakeResponse.reset();
}


exports.testDefaultResponse = function(test) {
  setUp();
  new StatsAction(fakeContext).execute(fakeContext);
  test.equal(200, fakeResponse.code);
  test.equal('text/html', fakeResponse.headers['Content-Type']);
  var str = fakeResponse.str;
  
  // Just test the three types of lines we produce.
  test.ok(str.indexOf('flat = just a string\n') != -1);
  test.ok(str.indexOf('<b>object</b>\n') != -1);
  test.ok(str.indexOf('  one = 111\n') != -1);
  
  test.done();
};


exports.testJsonResponse = function(test) {
  setUp();
  fakeQuery = {'type': 'json'};
  new StatsAction(fakeContext).execute(fakeContext);
  test.equal(200, fakeResponse.code);
  test.equal('application/json', fakeResponse.headers['Content-Type']);
  test.deepEqual(fakeStats.getStats(), JSON.parse(fakeResponse.str));
  test.done();
};

