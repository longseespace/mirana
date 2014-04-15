var mongoose = require('mongoose')
  , async = require('async')
  , mrequest = require('../../request')
  , kue = require('kue')
  , helper = require('./helper')
  , config = require('./config')
  ;

var db = new mongoose.Mongoose();
db.connect('mongodb://dynabyte.vn/mirana_bpl')

var Club = db.model('Club', require('./schema/club'));
var Manager = db.model('Manager', require('./schema/manager'));
var Match = db.model('Match', require('./schema/match'));
var Player = db.model('Player', require('./schema/player'));
var Stadium = db.model('Stadium', require('./schema/stadium'));

var self = {}
var jobManager = {}

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
  jobManager = options.jobManager;
};

// `exports.init` gets called by broadway on `app.init`.
exports.init = function(done) {
  jobManager.register('download.clublist', {
    complete: function(job, done){
      mrequest({
        uri: config.uri.club_list,
        json: true
      }, function(err, response, body){
        if (response.statusCode == 200) {
          config.current_season = body.siteHeaderSection.currentSeason.season;

          var clubs = [];
          for (var i = 0; i < body.siteHeaderSection.clubList.length; i++) {
            var club = body.siteHeaderSection.clubList[i];
            club._id = club.clubId;
            club.name = club.clubName;
            club.overridden_name = club.clubOverriddenName;

            club.alias = club.name.toLowerCase().replace(/\s/g, '-');

            clubs.push(club);
            job.progress(i + 1, body.siteHeaderSection.clubList.length);
          };

        } else {
          console.log({ error: "HTTP Error", message: "Error Code: " + response.statusCode });
        }
      })
    }
  });

  return done && done();
};

exports.setup = function(done) {

  // Destroy all data and start over
  self.removeAll(function(err){

    jobManager.create('download.clublist', {
      title: 'Download Club List',
      url: config.uri.club_list,
      json: true
    })

    return done && done(err);
  });
}
