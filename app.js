var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var cors = require('cors');
var fs = require('fs');
var routes = require('./routes/index');
var config = require('./config');
var redisM = require('./common/redisSub');

var app = express();

//init robot instance
require('./bots/botInstance')(process.env.MATTERMOST_USER, process.env.MATTERMOST_PASSWORD, 'APP', function () {});

// view engine setup
//app.set('views', path.join(__dirname, '/dist'));
//app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '/dist')));

fs.writeFileSync(path.join(__dirname, '/app.pid'), process.pid);

//Allow cross domain request
//app.use(cors());

app.use('/', routes);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


process.on('uncaughtException', function (err) {
    fs.appendFileSync(path.join(__dirname, '/exceptions.err'), new Date() + ' ' + err + '\n');
});

process.on('SIGINT', function () {
    fs.appendFileSync(path.join(__dirname, '/exceptions.err'), new Date() + ' ctrl-c trigger\n');
    process.exit();
});

module.exports = app;
