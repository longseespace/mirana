var broadway = require("broadway")
  , _ = require("underscore")
  , kue = require("kue")
  , JobManager = require("./lib/job_manager")
  , SourceManager = require("./lib/source_manager")
  , TaskManager = require("./lib/task_manager")
  , config = require("./config")
  , spawn = require('child_process').spawn
  , app = require('./lib/http/app')
  , logger = require('winston')  
  ;

var master = new broadway.App();

// Setup Logger
logger.add(logger.transports.File, { filename: 'logs/master.log' });

// Init Job Manager
JobManager.init(kue.createQueue({
  redis: config.redis
}));

// Init Task Manager
TaskManager.init();

// Load Sources
SourceManager.init(master).load();

// Init App
master.init(function (err) {
  if (err) {
    logger.error(err);
  }
  SourceManager.getSourceById("premierleague").setup();
  JobManager.start("premierleague");
});