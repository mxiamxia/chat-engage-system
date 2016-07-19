/**
 * Created by min on 6/13/16.
 */

var url = require('url');
var querystring = require('querystring');
var logger = require('../common/logger');
var _ = require('lodash');
var mattermostApi = require('../api/mattermostApi');
var sessionDao = require('../dao/session');
var robotManager = require('../core/robotManager');
var cache = require('../common/cache');
var cmHelper = require('../core/prologCmHelper');


//http://localhost:4012/api/createUser?email=cust_test@cyberobject.com&name=cust_test&password=123456
var createUser = function (req, res, next) {
    var resObj = url.parse(req.url);
    var result = {'message': 'create User failed'};
    logger.debug('Create User request query=' + JSON.stringify(querystring.parse(resObj.query)));
    var params = querystring.parse(resObj.query);
    mattermostApi.createUser(params.email, params.name, params.password, function (err, body) {
        if (err) {
            next(err);
        }
        result = body;
    });
    res.send(result);
}

exports.createUser = createUser;

var getSessionByRange = function (req, res) {
    sessionDao.getSessionByRange('', function (err, sessions) {
        res.send(sessions);
    })
};

exports.getSessionByRange = getSessionByRange;


var getAllSessions = function (req, res) {
    sessionDao.getAllSessions(function (err, sessions) {
        if(err) {
            return res.send([]);
        }
        res.send(sessions);
    })
};

exports.getAllSessions = getAllSessions;

var getAllRobot = function (req, res) {
    var robots = Object.keys(robotManager.getAllRobot());
    logger.debug('API get all robot=====' + robots.length);
    res.send(robots);
};
exports.getAllRobot = getAllRobot;

var getAllSessionKey = function (req, res) {
    cache.getKeys('ss*', function (err, keys) {
        return res.send(keys);
    });
};
exports.getAllSessionKey = getAllSessionKey;

var deleteSession = function (req, res) {
    var result = {};
    logger.debug('delete session id=' + JSON.stringify(req.body));
    var sessionId = req.body.sessionId;
    cache.get(sessionId, function (err, value) {
       if (err || _.isEmpty(value)) {
           result.code = 9999;
       }
        cmHelper.cleanCache('', 'quit', value, null, null, null);
        result.code = 1000;
        result.id = sessionId;
        res.send(result);
    });

};
exports.deleteSession = deleteSession;

var getSessionOfToday = function (req, res) {
    sessionDao.getSessionOfToday(function (err, nums) {
        if(err) {
            logger.debug('Today\'s session number err=' + err);
            return res.send([]);
        }
        var result = {number: nums};
        res.json(result);
    })
};
exports.getSessionOfToday = getSessionOfToday;

var getEngageOfToday = function (req, res) {
    sessionDao.getEngageOfToday(function (err, nums) {
        if(err) {
            logger.debug('Today\'s engage number err=' + err);
            return res.send([]);
        }
        var result = {number: nums};
        res.json(result);
    })
};
exports.getEngageOfToday = getEngageOfToday;