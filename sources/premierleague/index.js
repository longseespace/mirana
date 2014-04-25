var mongoose = require('mongoose')
  , async = require('async')
  , _ = require('underscore')
  , helper = require('./helper')
  , logger = require('winston')
  , config = require('./config')
  , TaskManager = require("../../lib/task_manager")
  , JobManager = require("../../lib/job_manager")
  , cheerio = require('cheerio')
  ;

var db = new mongoose.Mongoose();
db.connect('mongodb://dynabyte.vn/mirana_bpl')

var Club = db.model('Club', require('./schema/club'));
var Manager = db.model('Manager', require('./schema/manager'));
var Match = db.model('Match', require('./schema/match'));
var Player = db.model('Player', require('./schema/player'));
var Stadium = db.model('Stadium', require('./schema/stadium'));

var self = {}

// Start plugin

exports.name = "Barclay Premier League";

// `exports.attach` gets called by broadway on `app.use`
exports.attach = function(options) {

};

// `exports.init` gets called by broadway on `app.init`.
exports.init = function(done) {

  TaskManager.register("premierleague.cleanup", self.cleanup);

  TaskManager.register("premierleague.saveClubList", self.saveClubList);

  TaskManager.register("premierleague.updateClubOverview", self.updateClubOverview);

  return done && done();
};

exports.setup = function(done) {

  // JobManager.create(
  //   "premierleague",
  //   ["premierleague.cleanup"],
  //   {}
  // );

  // JobManager.create(
  //   "premierleague", 
  //   ["download", "premierleague.saveClubList"], 
  //   { 
  //     data: {
  //       uri: config.uri.clubList
  //     }
  //   } 
  // ).on("complete", function(){
  //   Club.find(null, function(err, clubs){
  //     for (var i = 0; i < clubs.length; i++) {
  //       var club = clubs[i];

  //       JobManager.create(
  //         "premierleague", 
  //         ["download", "premierleague.updateClubOverview"],
  //         { 
  //           data : {
  //             uri: config.uri.clubOverview.replace(':alias', club.alias)
  //           },
  //           club: club
  //         } 
  //       );

  //     };
  //   })
  // });
  
  

  return done && done();
}

/****************************/
/*          TASKS
/****************************/

self.cleanup = function(data, callback){

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
      return callback && callback(err, data);
    }
    if (results.length == 5) {
      return callback && callback(null, data);
    }
  });

}

self.saveClubList = function(data, callback) {
  var body = data.data;

  if (typeof body === "string") {
    body = JSON.parse(body);
  };

  config.currentSeason = body.siteHeaderSection.currentSeason.season;

  var clubs = [];
  for (var i = 0; i < body.siteHeaderSection.clubList.length; i++) {
    var club = body.siteHeaderSection.clubList[i];
    club._id = club.clubId;
    club.name = club.clubName;
    club.overridden_name = club.clubOverriddenName;

    club.alias = club.name.toLowerCase().replace(/\s/g, '-');

    clubs.push(club);
  };

  Club.create(clubs, function(err){
    callback(err, _.extend(data, { data: clubs }));
  });
}

self.updateClubOverview = function(data, callback) {
  var body = data.data;
  var club = data.club;
  var $ = cheerio.load(body);

  var $li = $('.clubheader .stats li');
  club.founded_year = $li.eq(0).find('p').text();
  club.manager = {
    name: $li.eq(1).find('a').text()
  },
  club.nickname = $li.eq(2).find('p').text();
  club.stadium = {
    name: $li.eq(3).find('a').text()
  }
  club.facebook_url = $('.clubheader .social .fb a').attr('href');
  club.twitter_url = $('.clubheader .social .tw a').attr('href');
  club.logo = config.uri.base + $('.clubheader .logo img').attr('src').replace('cq5dam.thumbnail.140.100.png', 'original');
  
  club.website = $('.clubheader .overlay .link a').attr('href');
  club.image_urls = [];

  $('.herosection img.heroimg').each(function(){
    club.image_urls.push(config.uri.base + $(this).attr('src'));
  })

  var id = club._id;
  delete club._id;

  Club.findByIdAndUpdate(id, club, { upsert: true }, function(err, model){
    if (err) {
      callback(err);
      return;
    }

    callback(null, _.extend(data, { data: club }));

    logger.info("Club " + club.name + " saved.");
  })
}