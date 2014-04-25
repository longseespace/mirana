var broadway = require("broadway")
  , _ = require("underscore")
  , kue = require("kue")
  , JobManager = require("./lib/job_manager")
  , SourceManager = require("./lib/source_manager")
  , TaskManager = require("./lib/task_manager")
  , config = require("./config")
  , child = require('child_process')
  , app = require('./lib/http/app')
  , logger = require('winston')
  ;

var mirana = new broadway.App();

// Setup Logger
logger.add(logger.transports.File, { filename: 'logs/mirana.log' });

// Init Job Manager
JobManager.init(kue.createQueue({
  redis: config.redis
}));

// Init Task Manager
TaskManager.init();

// Load Web App
app.set('port', config.app.httpPort);
var server = app.listen(app.get('port'), function() {
  logger.info('Mirana server listening on port ', server.address().port);
});

kue.app.listen(3001);

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