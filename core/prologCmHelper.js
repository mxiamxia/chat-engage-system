/**
 * Created by min on 6/10/16.
 */

var Q = require('q');
var logger = require('../common/logger');
var request = require('request');
var config = require('../config');
var util = require('util');
var _ = require('lodash');
var cache = require('../common/cache');
var consts = require('../common/consts');
var TEMP = require('../common/template');
var xml2js = require('xml2js');
var robotManager = require('./robotManager');
var engageAction = require('./engageAction');
var parser = new xml2js.Parser();

// only when engagement setup, allow agent to set engagement mode
var check3Way = function (prop, text, value) {
    if (value && prop && prop.msg_dest) {
        if (text === '@@toall' || prop.msg_dest === 'TOALL') {
            value.TO = 'ALL';
            cache.set(value.sessionId, value, config.redis_expire);
            return true;
        } else if (text === '@@toagent' || prop.msg_dest === 'TOCM') {
            value.TO = 'AGENT';
            cache.set(value.sessionId, value, config.redis_expire);
            return true;
        } else if (text == '@@tocustomer' || prop.msg_dest == 'TOCUST') {
            value.TO = 'CUSTOMER';
            cache.set(value.sessionId, value, config.redis_expire);
            return true;
        }
    }
    return false;
};
exports.check3Way = check3Way;


var sendMsgToApp = function (value, type, sentence) {
    //addCacheData(value.sessionId, consts.ANSWER, sentence);
    var deferred = Q.defer();
    if (type === 'SHADOW') {
        var input = util.format(TEMP.conversationReq, value.sessionId, value.agentId, sentence);
    } else {
        var input = util.format(TEMP.conversationReq, value.sessionId, value.realId, sentence);
    }
    logger.debug('Prolog CM conversation input===' + input);
    var options = {
        uri: config.CM_PROLOG,
        method: 'POST',
        qs: {request: input},
        headers: {'Content-Type': 'application/xml'}
    };
    request(options, function (err, response, body) {
        if (err) {
            logger.debug('conversation request err=' + err);
            return;
        }
        logger.debug('Prolog CM conversation output=' + body);
        if (body.indexOf('<xul>') > -1) {
            body = body.replace(/\r?\n|\r/g, '');
            deferred.resolve({'type': 'xul', 'message': body, 'code': 1000});
            //addCacheData(value.sessionId, consts.QUESTION, body);
        } else {
            parser.parseString(body, function (err, result) {
                try {
                    var statement = 'no valid answer returned';
                    if (_.isEmpty(result.response.body[0].question)) {
                        if (!_.isEmpty(result.response.body[0].statement)) {
                            statement = result.response.body[0].statement[0];
                        }
                    } else {
                        if (typeof result.response.body[0].question[0] === 'string') {
                            statement = result.response.body[0].question[0]
                        }
                    }
                    statement = statement.replace(/\r?\n|\r/g, '');
                    var data = {'type': 'message', 'message': statement, 'code': 1000};
                    //addCacheData(value.sessionId, consts.QUESTION, statement);
                    deferred.resolve(data);
                } catch (e) {
                    if(body.indexOf('existance error: [session') > -1) {
                        deferred.resolve({'code': 1801});
                    } else {
                        deferred.resolve({'code': 9999});
                    }
                }
            });
        }
    });
    return deferred.promise;
};

exports.sendMsgToApp = sendMsgToApp;


var cleanCache = function (room, text, value, robot, self, socket) {
    if (text.toLowerCase() === 'quit') {
        //robot.shutdown();
        //logger.debug('robot command length=' + robot.commands.length);
        //logger.debug('robot listener length=' + robot.listeners.length);
        //robot.listeners = [];  // remove message listener in Hubot
        //robot.commands = [];
        if (!_.isEmpty(value)) {
            //TODO:
            var sessionId = value.sessionId;
            var customerId = value.realId;
            cache.remove(sessionId);
            cache.remove(customerId);
            if (value.engagement) {
                var shadowCustomerId = value.shadowCustId;
                cache.remove(shadowCustomerId);
                var shadowRobot = robotManager.getRobot(shadowCustomerId);
                if (shadowRobot) {
                    engageAction.logoutShadowUser(shadowRobot, function (err, body) {
                        logger.debug('Logout shadow user response from quit action=' + JSON.stringify(body));
                    });
                }
                robotManager.delRobot(shadowCustomerId);
            }
        }
        if (self && !_.isEmpty(room)) {
            robot.messageRoom(room, 'Session is terminated');
        }
        else {
            if (socket) {
                socket.emit('response', {'userid': id, 'input': 'Session is terminated'});
            }
        }
        return true;
    }
    return false;
};

exports.cleanCache = cleanCache;

var addCacheData = function (id, key, value) {
    if (key === consts.QUESTION && value === 'I don\'t understand.') {
        return;
    }

    //TODO: may not need to retrieve cache here,
    cache.get(id, function (err, data) {
        if (!_.isEmpty(data)) {
            data[key] = value;
            cache.set(id, data, config.redis_expire)
        }
    });
};

var appToAgent = function (sentence, value, type, robot, self, socket) {
    sendMsgToApp(value, type, sentence)
        .then(function (result) {
            logger.debug('appToAgent conversation output===' + JSON.stringify(result));
            if (self) {
                if (result.code == 9999) {
                    robot.messageRoom(value.appAndShadowChannelId, 'Did not find a proper answer');
                } else {
                    if (type === 'REAL') {
                        robot.messageRoom(value.appAndShadowChannelId, sentence);
                    }
                    robot.messageRoom(value.appAndShadowChannelId, result.message);
                }
            } else {
                if (result.code == 9999) {
                    socket.emit('response', {'userid': id, 'input': 'Did not find a proper answer'});
                } else {
                    socket.emit('response', {'userid': id, 'input': result.message});
                }
            }
        });
};
exports.appToAgent = appToAgent;


var appToAll = function (sentence, value, type, robot, self, socket) {
    sendMsgToApp(value, type, sentence)
        .then(function (result) {
            logger.debug('appToAll conversation output===' + JSON.stringify(result));
            if (self) {
                if (result.code == 9999) {
                    robot.messageRoom(value.appAndShadowChannelId, 'Did not find a proper answer');
                    robot.messageRoom(value.realChannelId, 'Did not find a proper answer');

                } else {
                    if (type === 'REAL') {
                        robot.messageRoom(value.appAndShadowChannelId, sentence);
                    }
                    robot.messageRoom(value.appAndShadowChannelId, result.message);
                    robot.messageRoom(value.realChannelId, result.message);
                }
            } else {
                if (result.code == 9999) {
                    socket.emit('response', {'userid': id, 'input': 'Did not find a proper answer'});
                } else {
                    socket.emit('response', {'userid': id, 'input': result.message});
                }
            }
        });
};
exports.appToAll = appToAll;
