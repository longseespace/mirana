var config = {
  "app" : {
    "httpPort": 3000,
    "title": "Jobs"
  },
  "redis": {
    "port": "6379",
    "host": "127.0.0.1",
    "auth": "",
    "options": {}
  },
  "mongoose": {
    "uri": "mongodb://localhost/mirana",
    "options": {}
  },
  "disabled_plugins": ["test"]
}

module.exports = config