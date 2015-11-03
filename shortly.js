var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var bcrypt = require('bcrypt');


var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');
var session = require('express-session');

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
  secret: 'a big secret',
  name: 'cookie',
  resave: true,
  saveUninitialized: true
}));

var x = 1;

var isAuthenticated = function(req, res, next) {
  next();

  //if(x === 1) {
  //  console.log("Are we here/");
  //  x = -x;
  //  return next();
  //}
  //res.redirect('/login');
};

var setSession = function (request) {
  request.session.regenerate(function(){
    request.session.user = request.body.username;
  });
};

app.get('/', isAuthenticated, function(req, res) {
  // is user authenticated
    // if not redirect to /login
    // if so, render index
  res.render('index');
});

app.get('/login', function(req, res) {

  var username = req.body.username;
  var password = req.body.password;

  new User({username: username, password: password}).fetch().then(function (found) {
    if (found) {
      res.redirect('/index');
    } else {
      Users.create({
        username: username,
        password: password
      })
        .then(function (user) {
          setSession(req);
          res.redirect('/');
        })
        .catch(function (err) {
          console.log(err);
        });
    }

    res.render('login');
  });

});

app.post('/login', function (req, res) {
  new User({ username: username, password: password }).fetch().then(function (found) {
    if (found) {
      setSession(req);
      res.redirect('/index');
    } else {
      res.redirect('/login')
    }

    res.render('login');
  });
});


app.get('/signup',
  function(req, res) {
    res.render('signup');
  });


app.post('/signup', function(req, res) {

  var username = req.body.username;
  var password = req.body.password;

  new User({ username: username}).fetch().then(function(found) {
    if (found) {
      console.log("Found");
      res.redirect('http://google.com');
    } else {
      Users.create({
        username: username,
        password: password
      })
      .then(function(user) {
        setSession(req);
        res.redirect('/');
      })
      .catch(function(err){
        console.log(err);
      });
    }
  });
});



// handle post to /signup
  // collect username and password
    // make sure user doesn't exist
      // make user,db entry
        // forward to /index
        // start session stuff
    // ??? if user doesn't exist return error

app.get('/create', isAuthenticated, function(req, res) {
  // is user authenticated
    // if not redirect to /login
    // if so, render index
  res.render('index');
});

app.get('/links', isAuthenticated, function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.send(200, links.models);
  });
});

app.post('/links', isAuthenticated, function(req, res) {
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
    if (!link) {
      res.redirect('/');
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
