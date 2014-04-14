var mongoose = require('mongoose');

module.exports = new mongoose.Schema({
  _id: String,
  time: Number,
  clubs: {
    home: {},
    away: {}
  },
  score: {
    text: String,
    home: Number,
    away: Number
  },
  alias: String,
  attendance: Number,
  referee: Object,
  report: String
});