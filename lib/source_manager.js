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
  var items = fs.readdirSync('./lib/'+kSourceDir);
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var stat = fs.statSync('./lib/' + kSourceDir + '/' + item);
    if (stat.isDirectory() && fs.existsSync('./lib/' + kSourceDir + '/' + item + '/index.js')) {
      var source = {
        id: item,
        path: './' + kSourceDir + '/' + item + '/index'
      }
      this.sources.push(source);
    }
  };
  return this;
}

SourceManager.prototype.load = function(app, options) {
  for (var i = 0; i < this.sources.length; i++) {
    var source = this.sources[i];
    app.use(require(source.path), options);
    logger.info("Loaded plugin", source.id);
  };
  return this;
}