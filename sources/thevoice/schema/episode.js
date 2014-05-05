var mongoose = require('mongoose');

module.exports = new mongoose.Schema({
  _id: Number,
  name: String,
  imageSrc: String,
  bio: String
});