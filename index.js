var broadway = require("broadway")
  , _ = require("underscore")
  , kue = require("kue")
  , JobManager = require("./lib/job_manager")
  , SourceManager = require("./lib/source_manager")
  , config = require("./config.json")
  , child = require('child_process')
  , app = require('./lib/http/app')
  , logger = require('winston')
  ;

var mirana = new broadway.App();

// Setup Logger
logger.add(logger.transports.File, { filename: 'log/mirana.log' });

// Start Job Manager
mirana.jobManager = new JobManager(kue.createQueue({
  redis: config.redis
}));

// Load Sources
mirana.sourceManager = new SourceManager;
mirana.sourceManager.init().load(mirana, { jobManager : mirana.jobManager });

// Load Web App
app.set('port', config.app.httpPort);
var server = app.listen(app.get('port'), function() {
  logger.info('Mirana server listening on port ', server.address().port);
});

// Init App
mirana.init(function (err) {
  if (err) {
    logger.error(err);
  }
});

// Spawn Master
var master = child.fork('./master', function(error, stdout, stderr){
  logger.info(error, stdout, stderr);
})