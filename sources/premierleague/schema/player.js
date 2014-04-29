var mongoose = require('mongoose');

module.exports = new mongoose.Schema({
  _id: Number,
  full_name: String,
  alias: String,
  club: {},
  position: String,
  last_name: String,
  squad_no: Number,
  active: Boolean,

  dob: String,
  height: String,
  weight: String,
  nationality: String,
  appearances: Number,
  titles_won: Number,
  goals: Number,
  yellow_cards: Number,
  red_cards: Number,

  image_urls: [String],
  fan_rating: Number
});