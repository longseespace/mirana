var JobManager = require("../../lib/job_manager")
  , SourceManager = require("../../lib/source_manager")
  , TaskManager = require("../../lib/task_manager")
  ;


// `exports.attach` gets called by broadway on `app.use`
exports.attach = function(options) {

};

// `exports.init` gets called by broadway on `app.init`.
exports.init = function(done) {
  
  return done && done();
};

exports.setup = function(done) {
  JobManager.create(
    "test", 
    ["fetch", "log"], 
    { 
      data : {
        uri: "http://www.premierleague.com/ajax/site-header.json",
        json: true
      }
    } 
  );
  return done && done();
}