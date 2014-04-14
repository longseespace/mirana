var md5 = require("MD5")
  , request = require("request")
  , util = require("util")
  , fs = require("fs")
  , _ = require("underscore")
  , path = require("path")
  , config = require("../config.json")
  ;

var contentDir = "./content";

function MiranaRequest(options) {
  var filePath = contentDir + "/" + md5(options.uri);
  fs.exists(filePath, function(exists){
    if (exists) {
      fs.readFile(filePath, function (err, data) {
        if (err) throw err;
        var response = JSON.parse(data);
        var body = response.body;

        return options.callback(null, response, body);
      });
    } else {
      return request(options, function(error, response, body){
        if (!error && !exists) {
          fs.writeFile(filePath, JSON.stringify(response), function(err){
            if (err) {
              console.log("Can not cache URL: " + options.uri);
            }
          })
        }

        return options.callback(error, response, body);
      });
    }
  });
}

function mrequest(uri, options, callback){
  if (typeof uri === 'undefined') throw new Error('undefined is not a valid uri or options object.')
  if ((typeof options === 'function') && !callback) callback = options
  if (options && typeof options === 'object') {
    options.uri = uri
  } else if (typeof uri === 'string') {
    options = {uri:uri}
  } else {
    options = uri
  }

  options = _.clone(options)

  if (callback) options.callback = callback
  var r = new MiranaRequest(options)
  return r
}

module.exports = mrequest

mrequest.Request = MiranaRequest