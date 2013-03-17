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
flags.defineString('mongo_user', null, 'The user to use when connecting to mongodb.');
flags.defineString('mongo_passwd', null, 'The password to use when connecting to mongodb.');

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
      new mongo.Server(host, port, {auto_reconnect: true}),
      {native_parser: false, safe: true});
  var msg = 'mongodb://' + host + ':' + port + '/' + dbName;
  var logger = this.logger;
  db.open(function(err, db) {
    if (err) {
      logger.error('Unable to connect to data base', msg, ';', err);
      process.exit(1);
    }
    process.on('exit', function () {
      db.close();
    });

    ctx.registerProvider('db', function(requestContext) {
      return new Service(requestContext, db);
    });

    logger.info('Connected to', msg);

    var user = flags.get('mongo_user');
    var passwd = flags.get('mongo_passwd');
    if (user && passwd) {
	    logger.info('Authenticating user "', user, '"');
	    db.authenticate(user, passwd, function(err, success) {
		    if (success) {
			    logger.info('Authenticated!')
			    done();
		    } else {
			    err = err || Error('Unable to authenticate mongodb');
			    throw err;
		    }
	    })
    } else {
      done();
    }
  });

  return true; // Wait until the database is ready.
};
