var kue = require("kue")
  , _ = require("underscore")
  ;

var MAINQUEUE = 'main';

function JobManager(jobs) {
  this.jobs = jobs;
  this.mainqueue = MAINQUEUE;
  this._handles = {};
}

module.exports = JobManager

JobManager.prototype.create = function(type, job){
  job.type = type;
  return this.jobs.create(MAINQUEUE, job).save();
}

JobManager.prototype.register = function(type, process){

  if (_.isObject(process)) {
    var parts = type.split('.');
    var task = parts[0];
    var tag = "default";

    if (parts.length > 1) {
      tag = parts[1];
    } 
    if (!this._handles[task]) {
      this._handles[task] = {}
    } 
    this._handles[task][tag] = process;
  } else if (_.isFunction(process)) {
    this._handles[type] = {
      process: process
    }
  }

  console.log(this._handles);
}

JobManager.prototype.remove = function(type){
  delete this._handles[type];
}