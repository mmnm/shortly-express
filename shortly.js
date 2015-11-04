var express = require('express');
var session = require('express-session');
var util = require('util')
var GitHubStrategy = require('passport-github');

var GITHUB_CLIENT_ID = "b38b19e63c60decf1159"
var GITHUB_CLIENT_SECRET = "2d165b426a1d3ae20271e34bbd3ad0421131f3f1";



var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
app.use(session({
  secret: 'cooksofcooks',
  name: 'cookie',
  resave: true,
  saveUninitialized: true
}));

var passport = require('passport');
app.use(passport.initialize());
app.use(passport.session());




// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete GitHub profile is serialized
//   and deserialized.
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});


// Use the GitHubStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and GitHub
//   profile), and invoke a callback with a user object.
passport.use(new GitHubStrategy({
    clientID: GITHUB_CLIENT_ID,
    clientSecret: GITHUB_CLIENT_SECRET,
    callbackURL: "http://127.0.0.1:4568/auth/github/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    // asynchronous verification, for effect...
    process.nextTick(function () {
      
      // To keep the example simple, the user's GitHub profile is returned to
      // represent the logged-in user.  In a typical application, you would want
      // to associate the GitHub account with a user record in your database,
      // and return that user instead.
      return done(null, profile);
    });
  }
));




app.get('/auth/github',
  passport.authenticate('github'),
  function(req, res){
    // The request will be redirected to GitHub for authentication, so this
    // function will not be called.
  });

// GET /auth/github/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/auth/github/callback', passport.authenticate('github', { failureRedirect: '/login' }),
  function(req, res) {
    console.log("Github are we here");
    console.log(req.body.username);

    new User({ username: req.body.username }).fetch()
    .then(function(found) {
      if (found) {
        // send back error
        util.setSession(req, res);

      } else {
        Users.create({
          username: req.body.username
        })
        .then(function() {
          util.setSession(req, res);
        });
      }
    })
    .catch(function(err){
      console.log(err);
    });
  });



app.get('/', util.isAuthenticated, function(req, res) {
  res.render('index');
});

app.get('/login', function(req, res) {
  res.render('login');
});

app.post('/login', function (req, res) {
  new User({ username: req.body.username }).fetch()
    .then(function (user) {
    	if (!user) {
        // todo handle better
        res.redirect('/login');
      } else {
        var dbPassword = user.attributes.password;
        util.checkPassword(req.body.password, dbPassword)
          .then(function (match) {
          	if (match) {
              util.setSession(req, res);
            } else {
              res.redirect('/login')
            }
          })
      }
    });
});

app.get('/signup',
  function(req, res) {
    res.render('signup');
  });


app.post('/signup', function(req, res) {
  new User({ username: req.body.username }).fetch()
    .then(function(found) {
      if (found) {
        // send back error
        res.redirect('http://google.com');
      } else {
        util.generateSecurePassword(req.body.password)
          .then(function (hashedPassword) {
            return Users.create({
              username: req.body.username,
              password: hashedPassword
            })
          })
          .then(function() {
            util.setSession(req, res);
          });
      }
    })
    .catch(function(err){
      console.log(err);
    });
});

app.get('/create', util.isAuthenticated, function(req, res) {
  // is user authenticated
    // if not redirect to /login
    // if so, render index
  res.render('index');
});

app.get('/links', util.isAuthenticated, function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.send(200, links.models);
  });
});

app.post('/links', util.isAuthenticated, function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        Links.create({
          url: uri,
          title: title,
          base_url: req.headers.origin
        })
        .then(function(newLink) {
          res.send(200, newLink);
        });
      });
    }
  });
});


app.get('/logout', function(req, res) {
  req.session.active = false;
  req.session.destroy(function(err){
    res.redirect('/login');
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/



/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits')+1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
