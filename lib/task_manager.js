var kue = require("kue")
  , _ = require("underscore")
  , request = require('request')
  , logger = require('winston')
  , md5 = require('MD5')
  , assert = require('assert')
  , fs = require('fs')
  ;


var TaskManager = module.exports = {
  _handles : {}
}

TaskManager.register = function(task, process) {
  this._handles[task] = process;
};

TaskManager.getTask = function(task) {
  return this._handles[task];
}

TaskManager.init = function() {
  // Core Task
  
  this.register("fetch", function(data, cb) {
    request(data.data, function(err, httpResponse, body) {
      if (err || httpResponse.statusCode != 200) {
        return cb(err);
      }

      cb(null, _.extend(data, { data : body, httpResponse : httpResponse }));
    });
  })
  
  this.register("download", function(data, cb) {
    var uri = data.data;
    if (typeof uri === 'object') {
      uri = uri.uri;
    }
    var path = require('path').dirname(require.main.filename) + "/content/" + md5(uri);
    if (fs.existsSync(path)) {
      logger.info("Get data from cache: ", path);
      fs.readFile(path, 'utf8', function(err, body) {
        cb(err, _.extend(data, { data : body, path: path }));
      })
    } else {
      logger.info("Downloading: ", uri);
      request(data.data, function(err, httpResponse, body) {
        if (err) {
          return cb(err);
        }

        if (httpResponse.statusCode != 200) {
          return cb({
            statusCode: httpResponse.statusCode,
            body: body
          });
        };

        var path = require('path').dirname(require.main.filename) + "/content/" + md5(httpResponse.request.href);
        fs.writeFile(path, body, function(err){
          cb(err, _.extend(data, { data : body, path : path }));
        }) 
      });
    }
  })

  this.register("log", function(data, cb) {
    logger.info(data);
    cb(null, data);
  })

  this.register("echo", function(data, cb) {
    cb(null, data);
  })

  this.register("write to cache", function(data, cb) {
    var path = require('path').dirname(require.main.filename) + "/content/" + data.key;
    fs.writeFile(path, data.value, function(err){
      cb(err, _.extend(data, { data : path }));
    }) 
  })

  this.register("read from cache", function(data, cb) {
    var path = require('path').dirname(require.main.filename) + "/content/" + data.data;
    fs.readFile(path, 'utf8', function(err, data) {
      cb(err, _.extend(data, { data : data }));
    })
  })

}