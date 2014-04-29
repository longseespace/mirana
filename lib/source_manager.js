var logger = require('winston')
  , fs = require('fs')
  , _ = require('underscore')
  , config = require('../config')
  ;

var SourceManager = module.exports = {
  sources: [],
  app: {}
};

// Implementation

var kSourceDir = "sources";

SourceManager.init = function(app) {
  this.app = app;

  var items = fs.readdirSync('./'+kSourceDir);
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var stat = fs.statSync('./' + kSourceDir + '/' + item);
    if (!_.contains(config.disabled_plugins, item) && stat.isDirectory() && fs.existsSync('./' + kSourceDir + '/' + item + '/source.json')) {
      var source = require('../' + kSourceDir + '/' + item + '/source.json');
      if (!source.id) {
        source.id = item;
      };
      source.dir = item;
      this.sources.push(source);
    }
  };
  return this;
}

SourceManager.load = function(options) {
  for (var i = 0; i < this.sources.length; i++) {
    var source = this.sources[i];
    var item = require('../' + kSourceDir + '/' + source.dir + '/' + source.main);
    item.name = source.id;

    this.app.use(item, options);
  };
  return this;
}

SourceManager.getSourceById = function(source_id) {
  var source = this.app.plugins[source_id];
  for (var i = 0; i < this.sources.length; i++) {
    var s = this.sources[i];
    if (s.id == source_id) {
      source.__metadata = s;
      break;
    }
  };
  return source;
}