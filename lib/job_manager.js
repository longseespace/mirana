var kue = require("kue")
  , _ = require("underscore")
  , assert = require('assert')
  , async = require('async')
  , logger = require('winston')
  , TaskManager = require("./task_manager")
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

JobManager.start = function(source_id, options) {
  this.jobs.process(source_id, function(job, done) {
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
  })
}