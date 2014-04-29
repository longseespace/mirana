var mongoose = require('mongoose');

module.exports = new mongoose.Schema({
  _id: Number,
  timestamp: Number,
  state: String,
  stateKey: String,
  detailedState: String,
  detailedStateKey: String,
  score: Object,
  homeTeam: Object,
  awayTeam: Object,
  aliasData: Object,
  minutesIntoMatch: Number,
  attendance: Number,
  referee: Object,
  report: String
});