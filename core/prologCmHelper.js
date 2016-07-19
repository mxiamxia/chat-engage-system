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
var msg = require('./message');
var parser = new xml2js.Parser();
var CMPub = require('../common/redisSub').CMPub;
var CMSub = require('../common/redisSub').CMSub;

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
            return deferred.resolve({'code': 9999});
        }
        logger.debug('Prolog CM conversation output=' + body);

        if(body.indexOf('existance error: [session') > -1) {
            return deferred.resolve({'code': 1801});
        }

        body = body.replace(/\r?\n|\r/g, '');
        return deferred.resolve({'type': 'xul', 'message': body, 'code': 1000});
    });
    return deferred.promise;
};

exports.sendMsgToApp = sendMsgToApp;

var loginApp = function (id, room, app, message) {
    var deferred = Q.defer();
    var prologLogin = TEMP.loginReq;
    if (app.toLowerCase() === 'ivr') {
        prologLogin = util.format(prologLogin, id, message.sessionid, app, room);
    } else {
        prologLogin = util.format(prologLogin, id, '', app, room);
    }
    logger.debug('login input=' + prologLogin);
    logger.debug('login url=' + config.CM_PROLOG);
    var options = {
        uri: config.CM_PROLOG,
        method: 'POST',
        qs: {request: prologLogin},
        headers: {'Content-Type': 'application/xml'}
    };
    request(options, function (err, response, body) {
        if (err) {
            logger.debug('login request err=' + err);
            deferred.resolve({'code': 9999});
        } else {
            logger.debug('login body=' + JSON.stringify(body));
            parser.parseString(body, function (err, result) {
                try {
                    var sessionID = result.response.header[0].sessionid[0].$.value;
                    // var statement = result.response.body[0].statement[0];
                    var data = {'session': sessionID, 'statement': body, 'code': 1000};
                    deferred.resolve(data);
                } catch (e) {
                    deferred.resolve({'code': 9999});
                }
            });
        }
    });
    return deferred.promise;
};

exports.loginApp = loginApp;

var loginAppQ = function (id, app, message) {
    var prologLogin = TEMP.loginReq;
    if (app.toLowerCase() === 'ivr') {
        prologLogin = util.format(prologLogin, id, message.sessionid, app);
    } else {
        prologLogin = util.format(prologLogin, id, '', app);
    }
    logger.debug('login input=' + prologLogin);
    msg.sendMessage()
    CMPub.rpush(config.CMCHANNEL, prologLogin);
};
exports.loginAppQ = loginAppQ;

var cleanCache = function (room, text, value, robot, app) {
    if (text.toLowerCase() === 'quit') {
        //robot.shutdown();
        //logger.debug('robot command length=' + robot.commands.length);
        //logger.debug('robot listener length=' + robot.listeners.length);
        //robot.listeners = [];  // remove message listener in Hubot
        //robot.commands = [];
        if (!_.isEmpty(value)) {
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

        if(!_.isEmpty(value)) {
            msg.sendMessage(robot, room, value.realId, {message: 'Session is terminated', sessionid: value.sessionId}, app);
        } else {
            msg.sendMessage(robot, room, room, {message: 'Session is terminated', sessionid: value.sessionId}, app);
        }
    }
    return false;
};

exports.cleanCache = cleanCache;

var appToAgent = function (sentence, prop, value, type, robot, self, socket) {
    var new_prop = _.merge(prop, {msg_to: 'TOAGENT'});
    if (type === 'REAL') {
        // robot.messageRoom(value.appAndShadowChannelId, {message: '@@CUS@@' + sentence});
        var new_prop = _.merge(prop, {msg_to: 'TOAGENT'});
        msg.sendMessage(robot, socket, value.appAndShadowChannelId, value.realId, {message: '@@CUS@@' + sentence, prop: new_prop}, true);
    }

    sendMsgToApp(value, type, sentence)
        .then(function (result) {
            logger.debug('appToAgent conversation output===' + JSON.stringify(result));
            if (result.code == 9999) {
                // robot.messageRoom(value.appAndShadowChannelId, {message: '@@APP@@' + 'Did not find a proper answer'});
                msg.sendMessage(robot, socket, value.appAndShadowChannelId, value.realId, {message: '@@APP@@' + 'Did not find a proper answer', prop: new_prop}, true);
            } else {
                // if (type === 'REAL') {
                //     // robot.messageRoom(value.appAndShadowChannelId, {message: '@@CUS@@' + sentence});
                //     var new_prop = _.merge(prop, {msg_to: 'TOAGENT'});
                //     msg.sendMessage(robot, socket, value.appAndShadowChannelId, value.realId, {message: '@@CUS@@' + sentence, prop: new_prop}, true);
                // }
                // robot.messageRoom(value.appAndShadowChannelId, {message: '@@APP@@' +result.message});
                msg.sendMessage(robot, socket, value.appAndShadowChannelId, value.realId, {message: '@@APP@@' +result.message, prop: new_prop}, true);
            }
        });
};
exports.appToAgent = appToAgent;


var appToAll = function (sentence, prop, value, type, robot, self, socket) {
    var new_prop = _.merge(prop, {msg_to: 'TOALL'});
    if (type === 'REAL') {
        // robot.messageRoom(value.appAndShadowChannelId, {message: '@@CUS@@' + sentence});
        msg.sendMessage(robot, socket, value.appAndShadowChannelId, value.realId, {message: '@@CUS@@' + sentence, prop: new_prop}, true);
    }
    sendMsgToApp(value, type, sentence)
        .then(function (result) {
            logger.debug('appToAll conversation output===' + JSON.stringify(result));
            // if (self) {

            if (result.code == 9999) {
                // robot.messageRoom(value.appAndShadowChannelId, {message: '@@APP@@' + 'Did not find a proper answer'});
                msg.sendMessage(robot, socket, value.appAndShadowChannelId, value.realId, {message: '@@APP@@' + 'Did not find a proper answer', prop: new_prop}, true);
                // robot.messageRoom(value.realChannelId, {message: 'Did not find a proper answer'});
                msg.sendMessage(robot, socket, value.realChannelId, value.realId, {message: 'Did not find a proper answer', sessionid: value.sessionId, prop: new_prop}, self);

            } else if (result.code === 1801) {
                // robot.messageRoom(value.appAndShadowChannelId, {message: '@@APP@@' + 'The current session expired. Ready to init a new session.'});
                msg.sendMessage(robot, socket, value.appAndShadowChannelId, value.realId, {message: '@@APP@@' + 'The current session expired. Ready to init a new session.', prop: new_prop}, true);
                // robot.messageRoom(value.realChannelId, {message: 'The current session expired. Ready to init a new session.'});
                msg.sendMessage(robot, socket, value.realChannelId, value.realId, {message: 'The current session expired. Ready to init a new session.', sessionid: value.sessionId, prop: new_prop}, self);
                cleanCache('', 'quit', value, robot, self, socket);
            } else {
                if (type === 'REAL') {
                    // robot.messageRoom(value.appAndShadowChannelId, {message: '@@CUS@@' + sentence});
                    msg.sendMessage(robot, socket, value.appAndShadowChannelId, value.realId, {message: '@@CUS@@' + sentence, prop: new_prop}, true);
                }
                // robot.messageRoom(value.appAndShadowChannelId, {message: '@@APP@@' + result.message});
                msg.sendMessage(robot, socket, value.appAndShadowChannelId, value.realId, {message: '@@APP@@' + result.message, prop: new_prop}, true);
                // robot.messageRoom(value.realChannelId, {message: result.message});
                msg.sendMessage(robot, socket, value.realChannelId, value.realId, {message: result.message, sessionid: value.sessionId, prop: new_prop}, self);
            }
            // } else {
            //     if (result.code == 9999) {
            //         // socket.emit('response', {'userid': id, 'input': 'Did not find a proper answer'});
            //         msg.sendMessage(robot, socket, value.realChannelId, {message: 'Did not find a proper answer'}, self);
            //     } else {
            //         // socket.emit('response', {'userid': id, 'input': result.message});
            //         msg.sendMessage(robot, socket, value.realChannelId, {message: result.message}, self);
            //     }
            // }
        });
};
exports.appToAll = appToAll;
