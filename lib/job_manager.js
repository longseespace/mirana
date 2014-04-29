var kue = require("kue")
  , _ = require("underscore")
  , assert = require('assert')
  , async = require('async')
  , logger = require('winston')
  , TaskManager = require("./task_manager")
  , SourceManager = require('./source_manager')
  , cluster = require('cluster')
  , clusterWorkerSize = require('os').cpus().length
  ;

var JobManager = module.exports = {};

JobManager.init = function(jobs) {
  this.jobs = jobs;
  this._sources = {}
}

/**
 * Add job to queue
 * @param {String}  source_id   The source id of this job, eg. premierleague
 * @param {Array}   tasks       Array of tasks (String), eg. ["download", "premierleague.getClubList"]
 * @param {Object}  params      Data to pass into the job content
 */
JobManager.create = function(source_id, tasks, params) {
  if (!params) {
    params = {};
  }
  assert.equal(typeof params, 'object', "Params must be an Object");

  params.__metadata = {
    source_id : source_id,
    tasks: tasks
  }

  return this.jobs.create(source_id, params).save();
}

JobManager.startQueue = function(options) {
  options = _.defaults(options, {
    parallel : false
  });

  var jobProcessor = function(job, done) {
    var metadata = job.data.__metadata;
    delete job.data.__metadata;

    var tasks = [];

    tasks.push(function(cb){
      cb(null, job.data);
    });

    for (var i = 0; i < metadata.tasks.length; i++) {
      var taskName = metadata.tasks[i];
      tasks.push(TaskManager.getTask(taskName));
    };
    
    async.waterfall(tasks, function (err, result) {
      if (err) {
        logger.log(err);
      };
      return done && done(err);
    })
  };

  if (options.parallel) {
    if (cluster.isMaster) {
      for (var i = 0; i < clusterWorkerSize; i++) {
        cluster.fork();
      }
    } else {
      this.jobs.process(options.id, 5, jobProcessor);
    }
  } else if (cluster.isMaster) {
    this.jobs.process(options.id, jobProcessor);
  }
  
}

JobManager.start = function(source_id) {
  var source = SourceManager.getSourceById(source_id);
  var queues = source.__metadata && source.__metadata.queues ? source.__metadata.queues : null;
  if (!queues) {
    this.startQueue({ id : source_id });
  } else {
    for (var i = 0; i < queues.length; i++) {
      this.startQueue(queues[i]);
    };
  }
}