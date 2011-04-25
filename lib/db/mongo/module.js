/**
 * @fileoverview A module which sets up a connection to a MongoDB server and
 * registers a service for interacting with the database.
 *
 * @author dan@pupi.us (Daniel Pupius)
 */

module.exports = Module;

var Context = require('../../context');
var Service = require('./mongoservice');
var logging = require('logging');
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

    ctx.registerProvider('db', function() {
      return new Service(ctx, db);
    });
    
    logging.getLogger('dispatch.db.MongoModule').info(msg);
    done();
  });

  return true; // Wait until the database is ready.
};
