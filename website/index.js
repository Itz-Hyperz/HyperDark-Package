// Basic Imports
const config = require("./config.json");
const express = require("express");
const app = express();
const chalk = require('chalk');
const bcrypt = require('bcrypt');
const utils = require('hyperz-utils');

// MySQL Setup
const mysql = require('mysql');
config.sql.charset = "utf8mb4";
let con = mysql.createConnection(config.sql); // set = 0 to disable

// Backend Initialization
const backend = require('./backend.js');
backend.init(app, con);

// Discord Login Passport
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const DiscordStrategy = require('passport-discord-hyperz').Strategy;
passport.serializeUser(function(user, done) { done(null, user) });
passport.deserializeUser(function(obj, done) { done(null, obj) });
passport.use(new LocalStrategy({ usernameField: 'email' }, backend.authenticateUserLocal))
passport.use(new DiscordStrategy({
    clientID: config.discord.oauthId,
    clientSecret: config.discord.oauthToken,
    callbackURL: `${(config.domain.endsWith('/') ? config.domain.slice(0, -1) : config.domain)}/auth/discord/callback`,
    scope: ['identify', 'guilds', 'email'],
    prompt: 'consent'
}, function(accessToken, refreshToken, profile, done) {
    process.nextTick(function() {
        return done(null, profile);
    });
}));

// Routing
app.get('', function(req, res) {
    backend.refreshAppLocals(app);
    res.render('index.ejs', { loggedIn: req.isAuthenticated() });
});

app.get('/panel', backend.checkAuth, function(req, res) {
    backend.refreshAppLocals(app);
    con.query(`SELECT * FROM users WHERE userid="${req.user.userid}"`, async (err, row) => {
        if(err) throw err;
        if(!row[0]) res.redirect('/login');
        let user = row[0];
        con.query(`SELECT * FROM cats WHERE userid="${req.user.userid}"`, async (err, row) => {
            if(err) throw err;
            let cats = row;
            con.query(`SELECT * FROM entries WHERE userid="${req.user.userid}"`, async (err, row) => {
                if(err) throw err;
                let entries = row;
                res.render('panel.ejs', { loggedIn: true, user: user, cats: cats, entries: entries, currenttime: await utils.fetchTime(config.timeZone.tz, 'MM-DD-YYYY hh:mm A') });
            });
        });
    });
});

app.get('/cookies', function(req, res) {
    res.render('cookies.ejs', { loggedIn: req.isAuthenticated() });
});

app.get('/privacy', function(req, res) {
    res.render('privacy.ejs', { loggedIn: req.isAuthenticated() });
});

app.get('/login', backend.checkNotAuth, function(req, res) {
    res.render('login.ejs', { loggedIn: req.isAuthenticated() });
});

app.get('/register', backend.checkNotAuth, function(req, res) {
    res.render('register.ejs', { loggedIn: req.isAuthenticated() });
});
app.post('/register', backend.checkNotAuth, async (req, res) => {
    req.body.email = await utils.sanitize(req.body.email);
    try {
      let hashedPassword = await bcrypt.hash(req.body.password, 13)
      con.query(`SELECT * FROM users WHERE email="${req.body.email}"`, async function (err, row) {
        if(err) throw err;
        if(!row[0]) {
            con.query(`INSERT INTO users (userid, email, password, premium, webhook, secret) VALUES ("${backend.generateUserId(25)}", "${req.body.email}", "${hashedPassword}", false, "none", "${await utils.generateRandom(37)}")`, async function (err, row) {
                if(err) throw err;
            });
        };
        res.redirect('/login')
      });
    } catch {
      res.redirect('/register')
    };
});

app.post('/auth/local', backend.checkNotAuth, passport.authenticate('local', {
    successRedirect: '/panel',
    failureRedirect: '/login',
    failureFlash: true
}))
app.get('/auth/discord', passport.authenticate('discord'));
app.get('/auth/discord/callback', passport.authenticate('discord', {failureRedirect: '/'}), async function(req, res) {
    con.query(`SELECT * FROM users WHERE email="${req.user.email}"`, async function (err, row) {
        if(err) throw err;
        if(!row[0]) {
            let hashedPassword = await bcrypt.hash(await utils.generateRandom(22), 12)
            con.query(`INSERT INTO users (userid, email, password, premium, webhook, secret) VALUES ("${req.user.id}", "${req.user.email}", "${hashedPassword}", false, "none", "${await utils.generateRandom(37)}")`, async function (err, row) {
                if(err) throw err;
            });
        };
        req.user.userid = req.user.id;
    });
    res.redirect('/panel');
});

app.get('/logout', function(req, res) {
    req.logout(function(err) {
        if(err) { return next(err); }
    });
    res.redirect('/login');
});

// Searched the redirects for the page
config.redirects.forEach(element => {
    app.get(`/${element.name}`, (req, res) => {
        res.redirect(element.link);
    });
});

// MAKE SURE THIS IS LAST FOR 404 PAGE REDIRECT
app.get('*', function(req, res){
    res.render('404.ejs');
});

// Server Initialization
app.listen(config.port)
console.log(chalk.blue('Hyperz Cloud System Started on Port ' + config.port));

// Rejection Handler
process.on('unhandledRejection', (err) => { 
    if(config.debugMode) console.log(chalk.red(err));
});
