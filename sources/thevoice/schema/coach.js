var mongoose = require('mongoose');

module.exports = new mongoose.Schema({
  _id: String,
  name: String,
  imageSrc: String,
  bio: String
});