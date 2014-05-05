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
db.connect('mongodb://dynabyte.vn/mirana_thevoice');

var Coach = db.model('Coach', require('./schema/coach'));
var Contestant = db.model('Contestant', require('./schema/contestant'));
var Episode = db.model('Episode', require('./schema/episode'));

var self = {};

// Start plugin

exports.name = "The Voice";

// `exports.attach` gets called by broadway on `app.use`
exports.attach = function(options) {

};

// `exports.init` gets called by broadway on `app.init`.
exports.init = function(done) {

  TaskManager.register("thevoice.cleanup", self.cleanup);
  TaskManager.register("thevoice.saveArtistList", self.saveArtistList);
  TaskManager.register("thevoice.updateCoachInfo", self.updateCoachInfo);
  TaskManager.register("thevoice.updateContestantInfo", self.updateContestantInfo);
  TaskManager.register("thevoice.saveEpisodeList", self.saveEpisodeList);
  TaskManager.register("thevoice.updateEpisodeInfo", self.updateEpisodeInfo);

  return done && done();
};

exports.setup = function(done) {

  JobManager.create(
    "thevoice",
    ["thevoice.cleanup"],
    {}
  );

  JobManager.create(
    "thevoice", 
    ["download", "thevoice.saveArtistList"], 
    {
      data: {
        uri: "http://www.nbc.com/the-voice/artists/season-6"
      }
    } 
  ).on("complete", function(){

    // Populate contestant Details
    Contestant.find(null, function(err, contestants) {

      for (var i = 0; i < contestants.length; i++) {
        var contestant = contestants[i];

        JobManager.create(
          "thevoice",
          ["download", "thevoice.updateContestantInfo"],
          {
            data : {
              uri: "http://www.nbc.com/the-voice/artists/season-6/" + contestant._id
            },
            contestant: contestant
          }
        );
      };
    });

    // Populate coach Details
    Contestant.find(null, function(err, coaches) {

      for (var i = 0; i < coaches.length; i++) {
        var coach = coaches[i];

        JobManager.create(
          "thevoice",
          ["download", "thevoice.updateCoachInfo"],
          {
            data : {
              uri: "http://www.nbc.com/the-voice/bio/" + coach._id
            },
            coach: coach
          }
        );
      };
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
      Coach.remove(function(err){
        cb(err, "Coach");
      });
    },
    function(cb){ 
      Contestant.remove(function(err){
        cb(err, "Contestant");
      }); 
    },
    function(cb){ 
      Episode.remove(function(err){
        cb(err, "Episode");
      }); 
    }
  ], function(err, results){
    if (err) {
      return callback && callback(err, data);
    }
    if (results.length == 3) {
      return callback && callback(null, data);
    }
  });

}

self.saveArtistList = function(data, callback) {
  var $ = cheerio.load(data.data);

  var coaches = [];
  var contestants = [];
  $('.team-wrapper').each(function(i, e) {
    var coach = new Coach;
    coach._id = i+1;
    coach.name = $(e).find('.field-name-field-coach').text().trim();
    coach.imageSrc = $(e).find('.nbc_show_contestants_team-coach .field-name-field-coach-cover-image img').attr('src');
    coach.bio = '';

    coaches.push(coach);
    $(e).find(".nbc_show_contestants").each(function (i1, e1) {
      $(e1).find('.node-person').each(function (i2, e2) {
        var contestant = new Contestant;
        contestant._id = $(e2).find('a').attr('href').split('/')[4];

        contestants.push(contestant);              
      });
    });
  });

  Coach.create(coaches, function(err) {
    Contestant.create(contestants, function(err) {
      callback(err, _.extend(data, { 
        data: {
          coaches: coaches,
          contestants: contestants
        }}));
    });
  });
}

self.updateContestantInfo = function(data, callback) {
  var $ = cheerio.load(data.data);

  var contestant = data.contestant;

  contestant.name = $('h1', '.pane-nbc-page-title').text();
  contestant.team = $('.contestant-team-name a').text();
  var status = $('.pane-contestant-photo .field-name-field-person-cover-photo img').attr('src').split("_")[3];
  contestant.status = (status == 'eliminated') ? false : true;
  contestant.twitterUrl = $('.field-type-text-with-summary a').attr('href');

  contestant.imageSrc = $('.pane-contestant-photo .field-name-field-person-cover-photo img').attr('src');
  contestant.bio = $('.pane-content .field-name-body').text();
  $('.file-image a').each(function (imageIndex, imageEntry){
    contestant.photos.push($(imageEntry).attr("href"));
  });

  var id = contestant._id;
  delete contestant._id;

  Contestant.findByIdAndUpdate(id, contestant, { upsert: true }, function(err, model){
    if (err) {
      callback(err);
      return;
    }

    callback(null, _.extend(data, { data: contestant }));

    logger.info("Contestant: " + contestant.name + " saved.");
  })
}

self.updateCoachInfo = function(data, callback) {
  var $ = cheerio.load(data.data);

  var coach = data.coach;

  coach.bio = $('.group-right').text();

  var id = coach._id;
  delete coach._id;

  Coach.findByIdAndUpdate(id, coach, { upsert: true }, function(err, model) {
    if (err) {
      callback(err);
      return;
    }
  });

}

// self.saveClubList = function(data, callback) {
//   var body = data.data;

//   if (typeof body === "string") {
//     body = JSON.parse(body);
//   };

//   config.currentSeason = body.siteHeaderSection.currentSeason.season;

//   var clubs = [];
//   for (var i = 0; i < body.siteHeaderSection.clubList.length; i++) {
//     var club = body.siteHeaderSection.clubList[i];
//     club._id = club.clubId;
//     club.name = club.clubName;
//     club.overridden_name = club.clubOverriddenName;

//     club.alias = club.name.toLowerCase().replace(/\s/g, '-');

//     clubs.push(club);
//   };

//   Club.create(clubs, function(err){
//     callback(err, _.extend(data, { data: clubs }));
//   });
// }

// self.updateClubOverview = function(data, callback) {
//   var body = data.data;
//   var club = data.club;
//   var $ = cheerio.load(body);

//   var $li = $('.clubheader .stats li');
//   club.founded_year = $li.eq(0).find('p').text();
//   club.manager = {
//     name: $li.eq(1).find('a').text()
//   },
//   club.nickname = $li.eq(2).find('p').text();
//   club.stadium = {
//     name: $li.eq(3).find('a').text()
//   }
//   club.facebook_url = $('.clubheader .social .fb a').attr('href');
//   club.twitter_url = $('.clubheader .social .tw a').attr('href');
//   club.logo = config.uri.base + $('.clubheader .logo img').attr('src').replace('cq5dam.thumbnail.140.100.png', 'original');
  
//   club.website = $('.clubheader .overlay .link a').attr('href');
//   club.image_urls = [];

//   $('.herosection img.heroimg').each(function(){
//     club.image_urls.push(config.uri.base + $(this).attr('src'));
//   })

//   var id = club._id;
//   delete club._id;

//   Club.findByIdAndUpdate(id, club, { upsert: true }, function(err, model){
//     if (err) {
//       callback(err);
//       return;
//     }

//     callback(null, _.extend(data, { data: club }));

//     logger.info("Club " + club.name + " saved.");
//   })
// }

// self.updateClubStadium = function(data, callback) {
//   var body = data.data;
//   var club = data.club;
//   var $ = cheerio.load(body);

//   var $info = $('.stadiuminformation table.contentTable tr td.info');
//   var stadium = {};

//   stadium._id = club._id;
//   stadium.name = helper.trim($("#templatetitle").text().split('-')[1]);
//   stadium.address = $info.eq(0).find('p').html().replace(/<br>/g,' ');
//   stadium.year_built = ~~$info.eq(1).text();
//   stadium.capacity = ~~($info.eq(2).text().replace(/,/g,''));
//   stadium.pitch_area = $info.eq(3).text();
//   stadium.main_phone = $info.eq(4).text();
//   stadium.height = $info.eq(5).text();

//   club.stadium = stadium;

//   Stadium.create(stadium);

//   var id = club._id;
//   delete club._id;

//   Club.findByIdAndUpdate(id, club, { upsert: true }, function(err, model){
//     if (err) {
//       callback(err);
//       return;
//     }

//     callback(null, _.extend(data, { data: club }));

//     logger.info("Stadium for " + club.name + " saved.");
//   })
// }

// self.saveMatches = function(data, callback) {
//   var body = data.data;

//   if (typeof body === "string") {
//     body = JSON.parse(body);
//   }

//   var matches = [];
//   for (var i = 0; i < body.siteHeaderSection.matches.length; i++) {
//     var item = body.siteHeaderSection.matches[i];
//     var match = {
//       _id: item.matchId,
//       timestamp: item.timestamp,
//       state: item.matchState,
//       stateKey: item.matchStateKey,
//       detailedState: item.detailedState,
//       detailedStateKey: item.detailedStateKey,
//       score: item.score,
//       homeTeam: {
//         _id : ~~item.homeTeamId
//       },
//       awayTeam: {
//         _id: ~~item.awayTeamId
//       },
//       aliasData: item.matchCmsAliasData,
//       minutesIntoMatch: item.minutesIntoMatch
//     }

//     matches.push(match);
//   };

//   Match.create(matches, function(err){
//     callback(err, _.extend(data, { data: matches }));
//   })
// }

// self.savePlayerList = function(data, callback) {
//   var body = data.data;

//   if (typeof body === "string") {
//     body = JSON.parse(body);
//   };

//   var players = [];
//   for (var i = 0; i < body.playerIndexSection.index.resultsList.length; i++) {
//     var player = body.playerIndexSection.index.resultsList[i];

//     // Remap fields
//     player._id = player.id;
//     player.full_name = player.fullName;
//     player.club = { 
//       _id: player.club.id
//     }
//     player.active = player.activeInPremierLeague;
//     player.squad_no = player.squadNo;
//     player.alias = slug(player.cmsAlias);
//     player.last_name = player.lastName;

//     players.push(player);
//   };

//   Player.create(players, function(err){
//     callback(err, _.extend(data, { data: players }));
//   });
// }