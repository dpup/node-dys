/**
 * @fileoverview A module which sets up a connection to a MongoDB server and
 * registers a service for interacting with the database.
 *
 * @author dan@pupi.us (Daniel Pupius)
 */

module.exports = Module;

var Context = require('../../context');
var Service = require('./mongoservice');
var flags = require('flags');
var logg = require('logg');
var mongo = require('mongodb');

flags.defineString('mongo_db', 'dev', 'The mongodb data base name.')
flags.defineString('mongo_host', 'localhost', 'The hostname for mongodb.');
flags.defineInteger('mongo_port', 27017, 'The port for mongodb.');

/**
 * @constructor
 */
function Module(db, host, port) {
  this.db = db;
  this.host = host;
  this.port = port;
  
  this.logger = logg.getLogger('dys.db.MongoModule');
}


Module.prototype.init = function(ctx, done) {
	var dbName = this.db || flags.get('mongo_db');
  var host = this.host || flags.get('mongo_host');
  var port = this.port || flags.get('mongo_port');
  
  var db = new mongo.Db(
      dbName,
      new mongo.Server(host, port, {}),
      {native_parser: false});
  
  var msg = 'mongodb://' + host + ':' + port + '/' + dbName;
  var logger = this.logger;
  db.open(function(err, db) {
    if (err) {
      logger.error('Unable to connect to data base', msg, ';', err.message);
      process.exit(1);
    }
    process.on('exit', function () {
      db.close();
    });

    ctx.registerProvider('db', function(requestContext) {
      return new Service(requestContext, db);
    });
    
    logger.info('Connected to', msg);
    done();
  });

  return true; // Wait until the database is ready.
};
