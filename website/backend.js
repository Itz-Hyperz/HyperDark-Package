const config = require("./config.json");
const express = require("express");
const passport = require('passport');
const multer = require('multer');
const axios = require('axios');
const bodyParser = require('body-parser');
const session  = require('express-session');
const flash  = require('express-flash');
const utils = require('hyperz-utils');
const bcrypt = require('bcrypt');
let dbcon;

async function init(app, con) {
    if (Number(process.version.slice(1).split(".")[0] < 16)) throw new Error(`Node.js v16 or higher is required, Discord.JS relies on this version, please update @ https://nodejs.org`);
    var multerStorage = multer.memoryStorage();
    app.use(multer({ storage: multerStorage }).any());
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(express.json());
    app.use(flash());
    app.use(session({
        secret: 'keyboard cat',
        resave: false,
        saveUninitialized: false,
        cookie: {maxAge: 31556952000},
    }));
    app.use(passport.initialize());
    app.use(passport.session());
    app.set('views', './src/views');
    app.set('view engine', 'ejs');
    app.use(express.static('public'));
    app.use(express.static('src/static'));
    app.use('/assets', express.static(__dirname + 'public/assets'));
    app.use('/static', express.static(__dirname + 'src/static/assets'));
    dbcon = con;
    sqlLoop(con);
    await refreshAppLocals(app);
};

async function sqlLoop(con) {
    if(con == 0) return;
    await con.ping();
    setTimeout(() => sqlLoop(con), 60000 * 30);
};

async function checkAuth(req, res, next) {
    if(req.isAuthenticated()){
        dbcon.query(`SELECT * FROM users WHERE userid="${req.user.userid}"`, async function(err, row) {
            if(err) throw err;
            if(row[0]) {
                next();
            } else {
                res.redirect('/logout');
            };
        });
    } else{
        res.redirect("/login");
    };
};

async function checkNotAuth(req, res, next) {
    if(req.isAuthenticated()){
        res.redirect("/panel");
    } else{
        next();
    };
};

async function authenticateUserLocal(email, password, done) {
    dbcon.query(`SELECT * FROM users WHERE email="${await utils.sanitize(email)}"`, async function(err, row) {
        if(err) throw err;
        if(!row[0]) return done(null, false, { message: 'No user with that email' });
        try {
            if (await bcrypt.compare(password, row[0].password)) {
              return done(null, row[0]);
            } else {
              return done(null, false, { message: 'Password incorrect' });
            };
        } catch (e) {
            return done(e);
        };
    });
};

function generateUserId(length) {
    let result           = '';
    let characters       = '0123456789';
    let charactersLength = characters.length;
    for ( let i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
};

async function refreshAppLocals(app) {
    let githubProjectsPull = await axios({
        method: 'get',
        url: 'https://raw.githubusercontent.com/Itz-Hyperz/cloud.hyperz.net/main/projects.json'
    });
    let count = 0;
    let array = [0];
    while(count < githubProjectsPull.data.length - 1) {
        count++;
        array.push(count);
    };
    app.locals = {
        config: config,
        packagejson: require('./package.json'),
        project: githubProjectsPull.data[await utils.getRandomArray(array)],
        currentyear: await utils.fetchTime(config.timeZone.tz, 'YYYY')
    };
};

module.exports = {
    init: init,
    checkAuth: checkAuth,
    checkNotAuth: checkNotAuth,
    authenticateUserLocal: authenticateUserLocal,
    generateUserId: generateUserId,
    refreshAppLocals: refreshAppLocals
};
