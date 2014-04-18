var mongoose = require('mongoose');

module.exports = new mongoose.Schema({
  _id: Number,
  name: String,
  address: String,
  yeah_built: Number,
  capacity: Number,
  pitch_area: String,
  main_phone: String,
  height: String
});