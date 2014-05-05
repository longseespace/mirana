var mongoose = require('mongoose');

module.exports = new mongoose.Schema({
  _id: String, // Slug
  name: String,
  team: String,
  imageSrc: String,
  bio: String,
  status: Boolean,
  photos: [String],
  twitterUrl: String
});