var broadway = require("broadway")
  , _ = require("underscore")
  , kue = require("kue")
  , JobManager = require("./lib/job_manager")
  , SourceManager = require("./lib/source_manager")
  , config = require("./config.json")
  , spawn = require('child_process').spawn
  , app = require('./lib/http/app')
  , logger = require('winston')  
  ;

var master = new broadway.App();

// Setup Logger
logger.add(logger.transports.File, { filename: 'log/master.log' });

// Start Job Manager
master.jobManager = new JobManager(kue.createQueue({
  redis: config.redis
}));

// Load Sources
master.sourceManager = new SourceManager;
master.sourceManager.init().load(master, { jobManager : master.jobManager });

// Init App
master.init(function (err) {
  if (err) {
    logger.error(err);
  }
});
