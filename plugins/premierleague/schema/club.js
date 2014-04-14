var mongoose = require('mongoose');

module.exports = new mongoose.Schema({
  _id: Number,
  name: String,
  alias: String,
  overridden_name: String,
  founded_year: Number,
  manager: {
    name: String
  },
  nickname: String,
  stadium: Object,
  facebook_url: String,
  twitter_url: String,
  logo: String,
  website: String,
  image_urls: [String]
});