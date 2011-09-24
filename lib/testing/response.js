/**
 * @fileoverview A fake response object that records method calls, for use
 * in unit tests.
 *
 * @author dan@pupi.us (Daniel Pupius)
 */

module.exports = FakeResponse;


function FakeResponse() {
  this.headers = {};
  this.chunks = [];
}


FakeResponse.prototype.writeContinue = false;


FakeResponse.prototype.endCalled = false;


FakeResponse.prototype.statusCode = null;


FakeResponse.prototype.writeContinue = function() {
  if (this.continueCalled) {
    throw Error('writeContinue called multiple times');
  }
  this.continueCalled = true;
};


FakeResponse.prototype.writeHead = function(statusCode, headers) {
  this.statusCode = statusCode;
  for (var h in headers) {
    this.headers[h] = headers[h];
  }
};


FakeResponse.prototype.setHeader = function(name, value) {
  this.headers[name] = value;
};


FakeResponse.prototype.getHeader = function(name) {
  return this.headers[name];
};


FakeResponse.prototype.removeHeader = function(name) {
  delete this.headers[name];
};


FakeResponse.prototype.write = function(chunk, encoding) {
  encoding = encoding || 'utf8';
  this.chunks.push({content:chunk, encoding: encoding});
};


FakeResponse.prototype.addTrailers = function(headers) {
  this.trailers = headers;
};


FakeResponse.prototype.end = function(data, encoding) {
  if (this.endCalled) {
    throw Error('End called multiple times');
  }
  this.endCalled = true;
  if (data) {
    this.write(data, encoding);
  }
};
