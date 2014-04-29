var mongoose = require('mongoose')
  , async = require('async')
  , _ = require('underscore')
  , helper = require('./helper')
  , logger = require('winston')
  , config = require('./config')
  , TaskManager = require("../../lib/task_manager")
  , JobManager = require("../../lib/job_manager")
  , cheerio = require('cheerio')
  , slug = require('slug')
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

  TaskManager.register("premierleague.updateClubStadium", self.updateClubStadium);

  TaskManager.register("premierleague.saveMatches", self.saveMatches);

  TaskManager.register("premierleague.savePlayerList", self.savePlayerList);

  TaskManager.register("premierleague.updatePlayerProfile", self.updatePlayerProfile);

  return done && done();
};

exports.setup = function(done) {

  JobManager.create(
    "premierleague",
    ["premierleague.cleanup"],
    {}
  );

  JobManager.create(
    "premierleague", 
    ["download", "premierleague.saveClubList"], 
    { 
      data: {
        uri: config.uri.clubList
      }
    } 
  ).on("complete", function(){

    // Populate Club Details
    Club.find(null, function(err, clubs){

      for (var i = 0; i < clubs.length; i++) {
        var club = clubs[i];

        JobManager.create(
          "premierleague", 
          ["download", "premierleague.updateClubOverview"],
          { 
            data : {
              uri: config.uri.clubOverview.replace(':alias', club.alias)
            },
            club: club
          } 
        );
          
        JobManager.create(
          "premierleague", 
          ["download", "premierleague.updateClubStadium"],
          { 
            data : {
              uri: config.uri.clubStadium.replace(':alias', club.alias)
            },
            club: club
          } 
        );

      };
    });


    // Populate Matches
    JobManager.create(
      "premierleague", 
      ["download", "premierleague.saveMatches"], 
      { 
        data: {
          uri: config.uri.matches
        }
      } 
    );

    // Get Player List
    JobManager.create(
      "premierleague.savePlayerList", 
      ["download", "premierleague.savePlayerList"], 
      { 
        data: {
          uri: config.uri.playerList.replace(':limit', '1000').replace(':page', '1').replace(':season', config.currentSeason)
        }
      } 
    ).on('complete', function(){

      Player.find(null, function(err, players){

        for (var i = 0; i < players.length; i++) {
          var player = players[i];

          JobManager.create(
            "premierleague.updatePlayerProfile",
            ["download", "premierleague.updatePlayerProfile"],
            {
              data: {
                uri: config.uri.playerProfile.replace(':alias', player.alias)
              },
              player: player
            }
          );
        };

      })

    });

  });
  


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

self.updateClubStadium = function(data, callback) {
  try {
    var body = data.data;
    var club = data.club;
    var $ = cheerio.load(body);

    var $info = $('.stadiuminformation table.contentTable tr td.info');
    var stadium = {};

    stadium._id = club._id;
    stadium.name = helper.trim($("#templatetitle").text().split('-')[1]);
    stadium.address = $info.eq(0).find('p').html().replace(/<br>/g,' ');
    stadium.year_built = ~~$info.eq(1).text();
    stadium.capacity = ~~($info.eq(2).text().replace(/,/g,''));
    stadium.pitch_area = $info.eq(3).text();
    stadium.main_phone = $info.eq(4).text();
    stadium.height = $info.eq(5).text();

    club.stadium = stadium;

    Stadium.create(stadium);

    var id = club._id;
    delete club._id;

    Club.findByIdAndUpdate(id, club, { upsert: true }, function(err, model){
      if (err) {
        callback(err);
        return;
      }

      callback(null, _.extend(data, { data: club }));

      logger.info("Stadium for " + club.name + " saved.");
    })
  } catch (err) {
    callback(err);
  }
  
}

self.saveMatches = function(data, callback) {
  var body = data.data;

  if (typeof body === "string") {
    body = JSON.parse(body);
  }

  var matches = [];
  for (var i = 0; i < body.siteHeaderSection.matches.length; i++) {
    var item = body.siteHeaderSection.matches[i];
    var match = {
      _id: item.matchId,
      timestamp: item.timestamp,
      state: item.matchState,
      stateKey: item.matchStateKey,
      detailedState: item.detailedState,
      detailedStateKey: item.detailedStateKey,
      score: item.score,
      homeTeam: {
        _id : ~~item.homeTeamId
      },
      awayTeam: {
        _id: ~~item.awayTeamId
      },
      aliasData: item.matchCmsAliasData,
      minutesIntoMatch: item.minutesIntoMatch
    }

    matches.push(match);
  };

  Match.create(matches, function(err){
    callback(err, _.extend(data, { data: matches }));
  })
}

self.savePlayerList = function(data, callback) {
  var body = data.data;

  if (typeof body === "string") {
    body = JSON.parse(body);
  };

  var players = [];
  for (var i = 0; i < body.playerIndexSection.index.resultsList.length; i++) {
    var player = body.playerIndexSection.index.resultsList[i];

    // Remap fields
    player._id = player.id;
    player.full_name = player.fullName;
    player.club = { 
      _id: player.club.id
    }
    player.active = player.activeInPremierLeague;
    player.squad_no = player.squadNo;
    player.alias = slug(player.cmsAlias);
    player.last_name = player.lastName;

    players.push(player);
  };

  Player.create(players, function(err){
    callback(err, _.extend(data, { data: players }));
  });
}

self.updatePlayerProfile = function(data, callback) {
  try {

    var body = data.data;
    var player = data.player;
    var $ = cheerio.load(body);

    var $rows = $('.playerprofileoverview .contentTable tr');
  
    player.dob = $rows.eq(1).find('td').eq(1).text();
    player.height = $rows.eq(1).find('td').eq(2).text();
    player.weight = $rows.eq(2).find('td').eq(3).text();
    player.nationality = $rows.eq(3).find('td').eq(1).text();
    player.appearances = ~~$rows.eq(6).find('td').eq(1).text();
    player.titles_won = ~~$rows.eq(6).find('td').eq(3).text();
    player.goals = ~~$rows.eq(7).find('td').eq(1).text();
    player.yellow_cards = ~~$rows.eq(8).find('td').eq(1).text();
    player.red_cards = ~~$rows.eq(9).find('td').eq(1).text();

    player.image_urls = [
      config.uri.base + $('.playerheader .heroimg').attr('src')
    ];
    player.position = $('.playerheader ul.stats > li').eq(1).find('p').text().toLowerCase();
    player.fan_rating = +$('.playerheader ul.stats > li').eq(4).find('p').text();

    if (isNaN(player.fan_rating)) {
      player.fan_rating = 0;
    };

    var id = player._id;
    delete player._id;

    Player.findByIdAndUpdate(id, player, { upsert: true }, function(err, model){
      if (err) {
        callback(err);
        return;
      }

      callback(null, _.extend(data, { data: player }));

      logger.info("Player " + player.full_name + " updated.");
    })
  } catch (err) {
    callback(err);
  }

  
}