var config = {
  "currentSeason": "2013-2014",
  "uri": {
    "base": "http://www.premierleague.com",
    "clubList": "http://www.premierleague.com/ajax/site-header.json",
    "clubOverview": "http://www.premierleague.com/en-gb/clubs/profile.overview.html/:alias",
    "clubStadium": "http://www.premierleague.com/en-gb/clubs/profile.stadium.html/:alias",
    "matches": "http://www.premierleague.com/ajax/site-header/ajax-all-matches.json",
    "playerList": "http://www.premierleague.com/ajax/player/index/BY_CLUB/null/null/null/null/null/ALL/:season/null/null/:limit/4/2/2/:page/null.json",
    "playerProfile": "http://www.premierleague.com/en-gb/players/profile.overview.html/:alias"
  }
}

module.exports = config