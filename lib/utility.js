var request = require('request');
var Promise = require('bluebird');
var bcrypt = require('bcrypt');

exports.getUrlTitle = function(url, cb) {
  request(url, function(err, res, html) {
    if (err) {
      console.log('Error reading url heading: ', err);
      return cb(err);
    } else {
      var tag = /<title>(.*)<\/title>/;
      var match = html.match(tag);
      var title = match ? match[1] : url;
      return cb(err, title);
    }
  });
};

var rValidUrl = /^(?!mailto:)(?:(?:https?|ftp):\/\/)?(?:\S+(?::\S*)?@)?(?:(?:(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[0-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))|localhost)(?::\d{2,5})?(?:\/[^\s]*)?$/i;

exports.isValidUrl = function(url) {
  return url.match(rValidUrl);
};

/************************************************************/
// Add additional utility functions below
/************************************************************/

exports.isAuthenticated = function(req, res, next) {
  next();

  //if(x === 1) {
  //  console.log("Are we here/");
  //  x = -x;
  //  return next();
  //}
  //res.redirect('/login');
};

exports.setSession = function (request) {
  request.session.regenerate(function(){
    request.session.user = request.body.username;
  });
};

// returns a promise for the hash generation stage after the generation of the salt
exports.generateSecurePassword = function (plainTextPassword) {
  var genSaltAsync = Promise.promisify(bcrypt.genSalt);
  var hashAsync = Promise.promisify(bcrypt.hash);

  return genSaltAsync(12)
    .then(function(salt) {
      return hashAsync(plainTextPassword, salt);
    });
};

exports.checkPassword = function (plainTextPassword, hash) {
  var compareAsync = Promise.promisify(bcrypt.compare);
  return compareAsync(plainTextPassword, hash);
};


