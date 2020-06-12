
  const passport = require('passport');
  const User = require('../models/user');
const LocalStrategy = require('passport-local').Strategy;
/**
*Configuration and Settings
*/
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    if(err) {
      console.error('There was an error accessing the records of' +
      ' user with id: ' + id);
      return console.log(err.message);
    }
        return done(null, user);
  })
});
/**
*Strategies
*/
//---------------------------local login----------------------------------------
passport.use('local', new LocalStrategy({
        usernameField : 'email',
        passwordField : 'pwd',
        passReqToCallback : true
    },
    function(req, email, password, done) {
        User.findOne({email: email}, function(err, user) {
            if(err) {
              return errHandler(err);
              }
            if(!user) {
              return done(null, false, {errMsg: 'User does not exist, please' +
              ' <a class="errMsg" href="/signup">signup</a>'});
              }
            if(!user) {
              return done(null, false, {errMsg: 'Invalid password try again'});
              }
            return done(null, user);
        });

}));
/**
*Export Module
*/
module.exports = passport;