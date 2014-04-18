var mongoose = require('mongoose')
  , async = require('async')
  , mrequest = require('../../lib/request')
  , kue = require('kue')
  , helper = require('./helper')
  , config = require('./config')
  , TaskManager = require("../../lib/task_manager")
  ;

var db = new mongoose.Mongoose();
db.connect('mongodb://dynabyte.vn/mirana_bpl')

var Club = db.model('Club', require('./schema/club'));
var Manager = db.model('Manager', require('./schema/manager'));
var Match = db.model('Match', require('./schema/match'));
var Player = db.model('Player', require('./schema/player'));
var Stadium = db.model('Stadium', require('./schema/stadium'));

var self = {}

self.removeAll = function(callback){

  async.parallel([
    function(cb){ 
      Club.remove(function(err){
        cb(err, "Club");
      });
    },
    function(cb){ 
      Manager.remove(function(err){
        cb(err, "Manager");
      }); 
    },
    function(cb){ 
      Match.remove(function(err){
        cb(err, "Match");
      }); 
    },
    function(cb){ 
      Player.remove(function(err){
        cb(err, "Player");
      }); 
    },
    function(cb){ 
      Stadium.remove(function(err){
        cb(err, "Stadium");
      }); 
    }
  ], function(err, results){
    if (err) {
      console.log(err);
      return callback && callback(err);
    }
    if (results.length == 5) {
      return callback();
    }
  });

}

// Start plugin

exports.name = "Barclay Premier League";

// `exports.attach` gets called by broadway on `app.use`
exports.attach = function(options) {

};

// `exports.init` gets called by broadway on `app.init`.
exports.init = function(done) {
  

  return done && done();
};

exports.setup = function(done) {

  // Destroy all data and start over
  self.removeAll(function(err){

    return done && done(err);
  });
}
