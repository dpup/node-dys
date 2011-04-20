/**
 * @fileoverview Service for interacting with MongoDB.
 *
 * @author dan@pupi.us (Daniel Pupius)
 */

module.exports = MongoService;

var base = require('../../base');
var ObjectID = require('mongodb').BSONNative.ObjectID;


/**
 * Constructs a new service for interacting with MongoDB.
 * @param {Context} ctx The request scoped context object.
 * @param {mongo.Db} db The DB Object from mongo-native.
 * @constructor
 */
function MongoService(ctx, db) {
  this.ctx = ctx;
  this.db = db;
}


/**
 * List of methods that can be used to create a pre-bound helper object that
 * has all the listed methods scoped to a predefined collection.
 * See #newHelper.
 * @type {!Array.<string}
 */
MongoService.HELPER_FNS = ['find', 'dump', 'byId', 'insert'];


MongoService.prototype.newHelper = function(col) {
  var helper = {};
  for (var i = 0; i < MongoService.HELPER_FNS.length; i++) {
    var name = MongoService.HELPER_FNS[i];
    helper[name] = this[name].bind(this, col);
  }
  return helper;
};


MongoService.prototype.find = function(col, var_args) {
  var callback = DEFAULT_CB, query = {}, options = {};
  if (arguments.length == 2) {
    callback = base.wrap(this.ctx, arguments[1]);
  } else if (arguments.length == 3) {
    query = arguments[1];
    callback = base.wrap(this.ctx, arguments[2]);
  } else if (arguments.length == 4) {
    query = arguments[1];
    options = arguments[2];
    callback = base.wrap(this.ctx, arguments[3]);    
  }
  
  this.db.collection(col, function(err, collection) {
    if (err) return callback(err, null);
    collection.find(query, options, callback);
  }); 
};


MongoService.prototype.findFirst = function(col, query, options, callback) {
  callback = base.wrap(this.ctx, callback);
  options['limit'] = 1;
  this.find(col, query, options, function(err, cursor) {
    if (err) return callback(err, null);
    cursor.nextObject(callback);
  });
};


MongoService.prototype.dump = function(col, opt_query, opt_options) {
  this.find(col, opt_query || {}, opt_options || {}, function(err, cursor) {
    if (err) return console.log(err);
    cursor.toArray(function(err, doc) {
      if (err) console.log(err);
      console.log(util.inspect(doc)); 
    });
  });
};


MongoService.prototype.byId = function(col, id, callback) {
  callback = callback ? base.wrap(this.ctx, callback) : DEFAULT_CB;
  this.find(col, {'_id': new ObjectID(id)}, function(err, cursor) {
    if (err) return callback(err, null);
    cursor.nextObject(callback);
  });
};


MongoService.prototype.insert = function(col, item, callback) {
  callback = callback ? base.wrap(this.ctx, callback) : DEFAULT_CB;
  this.db.collection(col, function(err, collection) {
    if (err) return callback(err, null);
    collection.insert(item, {safe: true}, callback);
  });
};


function DEFAULT_CB() {
  console.log(util.inspect(arguments));
}