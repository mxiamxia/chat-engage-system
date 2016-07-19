/**
 * Created by min on 7/11/16.
 */


var url = require('url');
var querystring = require('querystring');
var logger = require('../common/logger');
var _ = require('lodash');
var mattermostApi = require('../api/mattermostApi');
var async = require('async');
var fs = require('fs');
var path = require('path');
var initHubot = require('../bots/botInstance');
var engage = require('../core/engageAction');
var robotManager = require('../core/robotManager');
var CM = require('../core/prologCm');
var logger = require('../common/logger');

var userList = {};
var appid = 'wgwwqx5ei789fngx86osp6bzmo';

//http://localhost:4012/api/createMultipleUsers?nums=5&&username=test&&message=ready to close a job
var createMultipleUsers = function (req, res, next) {
    var reqObj = url.parse(req.url);
    logger.debug('create multi user url = ' + req.headers.host);
    var params = querystring.parse(reqObj.query);
    var host = req.headers.host;
    var numOfUser = params.nums;
    var username = params.username;
    var message = params.message;
    if (numOfUser && numOfUser > 0) {
        var fnArray = [];
        for (var i=0; i<numOfUser; i++) {
            (function (idx) {
                var name = username+'_'+idx;
                fnArray.push(function(cb){initUser(name+'@cyberobject.com', '123456', name, host, cb)});
            })(i);
        }
    }
    async.parallel(fnArray, function (err, results) {
        if (err) {
            logger.debug('create multi user errs');
            res.send(err);
            return;
        }
        logger.debug('create multi user results=' + results);
        if (fs.existsSync(path.join(__dirname, '/../urls.txt'))) {
            fs.unlinkSync(path.join(__dirname, '/../urls.txt'));
        }

        results.forEach(function (value) {
            var output = 'http://' + host+ '/api/sendMessage/' + value + '/' + message;
            fs.appendFileSync(path.join(__dirname, '/../urls.txt'), output+'\n');
        });

        res.send(results);
    });
};

var initUser = function (user, password, name, host, cb) {
    mattermostApi.createUser(user, password, name, function (err, response) {
        if ((response.message === 'An account with that username already exists.' || response.message === 'An account with that email already exists.')
            || (response.username && (response.username.toLowerCase() === name.toLowerCase()))) {
            initHubot(user, '123456', 'CUSTOMER', function (err, robot) {
                if (err) {
                    logger.debug('load test init err' + err);
                    return cb(user +' init failed with err=');
                }

                engage.getChannelIdById(appid, robot, function (err, room) {
                    logger.debug("load test " + user + ' room id ' + room);
                    userList[name] = {robot: robot, room: room};
                    cb(null, name);
                });
            });
        }
    });

};

exports.createMultipleUsers = createMultipleUsers;

var sendMessage = function (req, res, next) {
    if (Object.keys(userList).length === 0) {
        return res.send(500);
    }
    if (req.params.user && req.params.message) {
        var robot = userList[req.params.user].robot;
        var room  = userList[req.params.user].room;
        robot.messageRoom(room, req.params.message);
    }
    res.send('one round successful');

};
exports.sendMessage = sendMessage;


//siege --concurrent=10 --reps=5 http://localhost:4012/api/sendAooMessage/mxiatest/ready%20to%20close%20a%20job
var sendAppMessage = function (req, res, next) {
    if (req.params.user && req.params.message) {
        var id = req.params.user;
        var message = req.params.message;
        var robot = robotManager.getRobot('APP');
        CM.processPrologMessage(id, {message: message}, robot, 'MM', id, function (err, result) {
            res.send('app result=' + JSON.stringify(result));
        });
    }
};

exports.sendAppMessage = sendAppMessage;




