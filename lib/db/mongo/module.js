/**
 * @fileoverview A module which sets up a connection to a MongoDB server and
 * registers a service for interacting with the database.
 *
 * @author dan@pupi.us (Daniel Pupius)
 */

module.exports = Module;

var Context = require('../../context');
var Service = require('./mongoservice');
var mongo = require('mongodb');


/**
 * @constructor
 */
function Module(db, host, port) {
  this.db = db;
  this.host = host || 'localhost',
  this.port = port || 27017;
}


Module.prototype.init = function(ctx, done) {
  var db = new mongo.Db(
      this.db,
      new mongo.Server(this.host, this.port, {}),
      {native_parser: true});
      
  var msg = 'Connected to mongodb://' + this.host + ':' + this.port + '/' + this.db;
  db.open(function(err, db) {
    if (err) throw err;
    process.on('exit', function () {
      db.close();
    });
    
    // Register a request-scoped provider that creates an instance for each
    // request.
    ctx.registerProvider('db', function(ctx) {
      return new Service(ctx, db);
    }, Context.Scope.REQUEST);
    
    // Register an provider for non-request scoped contexts.  Each call will
    // get a new instance.
    ctx.registerProvider('db', function() {
      return new Service(ctx, db);
    });
    
    ctx.get('log').getLogger('MongoModule').log(msg);
    done();
  });

  return true; // Wait until the database is ready.
};
