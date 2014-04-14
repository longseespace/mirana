var mongoose = require('mongoose');

module.exports = new mongoose.Schema({
  _id: String,
  hash: String,
  name: String,
  description: String,
  image_urls: [{
    thumbnail: String,
    original: String
  }],
  filmography: [{
    job_type: String,
    titles: [{
      _id: String,
      title: String,
      subtitle: String,
      year: Number,
      role: String
    }]
  }],
  biography: {
    text: String,
    html: String
  }
});