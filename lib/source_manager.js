var logger = require('winston')
  , fs = require('fs')
  ;

function SourceManager() {
  this.sources = []
}

module.exports = SourceManager

// Implementation

var kSourceDir = "sources";

SourceManager.prototype.init = function() {
  var items = fs.readdirSync('./'+kSourceDir);
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var stat = fs.statSync('./' + kSourceDir + '/' + item);
    if (stat.isDirectory() && fs.existsSync('./' + kSourceDir + '/' + item + '/source.json')) {
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

SourceManager.prototype.load = function(app, options) {
  for (var i = 0; i < this.sources.length; i++) {
    var source = this.sources[i];
    var item = require('../' + kSourceDir + '/' + source.dir + '/' + source.main);
    app.use(item, options);

    logger.info("Loaded plugin", source);
  };
  return this;
}