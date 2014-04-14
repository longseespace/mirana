var broadway = require("broadway")
  , _ = require("underscore")
  , kue = require("kue")
  , JobManager = require("./lib/job_manager")
  , config = require("./config.json")
  , spawn = require('child_process').spawn
  ;

var app = new broadway.App();
app.jobManager = new JobManager(kue.createQueue({
  redis: config.redis
}));

app.use(require("./plugins/premierleague/index"), { app : app });

app.init(function (err) {
  if (err) {
    console.log(err);
  }
  app.plugins['Barclay Premier League'].setup(function(){
    
  });
});

kue.app.listen(config.app.httpPort);
kue.app.set('title', config.app.title);
