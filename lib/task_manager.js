var kue = require("kue")
  , _ = require("underscore")
  , request = require('request')
  , logger = require('winston')
  ;


var TaskManager = module.exports = {
  _handles : {}
}

TaskManager.register = function(task, process) {
  var ns = "mirana";
  var taskid = task;

  var parts = task.split('.');
  if (parts.length == 2) {
    ns = parts[0];
    taskid = parts[1];
  }

  this._handles[ns + '.' + taskid] = process;
};

TaskManager.getTask = function(task) {
  return this._handles[task];
}

TaskManager.init = function() {
  // Register default task
  this.register("download", function(options, cb) {
    request(options, function(err, httpResponse, body) {
      if (err) {
        cb(err);
      }
      cb(null, body);
    });
  })

  this.register("log", function(options, cb) {
    logger.log(options);
    cb(null, options);
  })

  this.register("nop", function(options, cb) {
    cb(null, options);
  })
}