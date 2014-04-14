var spawn = require('child_process').spawn;
var kue = require('kue');
var cluster = require('cluster');
var numCPUs = require('os').cpus().length;
var _ = require('underscore');

var maxConcurentJob = 20;

function Master(jobManager) {
  this._jobManager = jobManager;
}

module.exports = Master

Master.prototype.process = function(callback) {
  var jobManager = this._jobManager;
  var jobs = jobManager.jobs;

  for (var i = 0; i < numCPUs; i++) {
    cluster.fork({
      maxConcurentJob: maxConcurentJob
    });
  }
}

if (cluster.isWorker) {
  require('./worker');
}