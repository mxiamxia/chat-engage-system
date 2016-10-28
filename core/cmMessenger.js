/**
 * Created by min on 7/19/16.
 */


var robotManager = require('../core/robotManager');
var _ = require('lodash');
var logger = require('../common/logger');
var xml2js = require('xml2js');
var parser = new xml2js.Parser();
var cache = require('../common/cache');
var msg = require('./message');
var sessionDao = require('../dao/').Session;
var config = require('../config');
var cmHelper = require('./prologCmHelper');
var engageAction = require('./engageAction');

var process = function (message) {
    if (_.isEmpty(message)) {
        logger.error('received empty message from cm queue');
        return;
    }
    parser.parseString(message, function (err, result) {
        try {
            var action = result.response.header[0].action[0].$.value;
            logger.debug('CM message action = ' + action);
            switch (action) {
                case 'login':
                    loginProcess(message, result);
                    break;
                case 'conversation':
                    conversationProcess(message, result);
                    break;
                case 'transfer_start':
                    engageAction.transferStart(message);
                    break;
                case 'transfer_accept':
                    break;
                case 'transfer_leave':
                    break;
                default:
                    logger.debug('no valid action found=' + action);
            }
        } catch (err) {
            logger.error('process message error=' + err);
        }
    });
};

exports.process = process;

var loginProcess = function (message, result) {
    var sessionid = result.response.header[0].sessionid[0].$.value;
    var id = result.response.header[0].userid[0].$.value;
    var app = result.response.header[0].app[0].$.value;
    var channel = result.response.header[0].channel[0].$.value;
    var appId = result.response.header[0].appid[0].$.value;

    logger.debug('Prolog CM login output=' + JSON.stringify(result));
    var robot = robotManager.getRobot('APP_' + appId);
    var session = sessionid;
    var customCache = { sessionId: session, type: 'REAL' };
    var sessionInfo = {
        'sessionId': session,
        'realId': id,
        'realChannelId': channel,
        'appId': robot.adapter.profile.id,
        'channelType': app,
        'application': appId
    };
    sessionDao.getSessionById(session, function (err, sessionRecord) {
        if (!err && sessionRecord) {
            return;
        } else {
            sessionDao.newAndSave(session, robot.adapter.profile.id, id, app, function (err, sessionRecord) {
                logger.debug('Create new session info into mongo db=' + JSON.stringify(sessionRecord));
            });
        }
    });

    cache.pget('ss' + session)
        .then(function (value) {
            if (_.isEmpty(value)) {
                cache.set(id+appId, customCache, config.redis_expire);
                cache.set('ss' + session, sessionInfo, config.redis_expire);
            }
        })
        .catch(function (err) {
            logger('cache errout=' + err);
        });

    var new_prop = { msg_type: 'login' };
    msg.sendMessage(robot, channel, id, { message: message, props: new_prop, sessionid: session }, app);
    //TODO: send original text to app
};

var conversationProcess = function (message, result) {
    var sessionid = result.response.header[0].sessionid[0].$.value;
    var id = result.response.header[0].userid[0].$.value;
    var app_h = result.response.header[0].app[0].$.value;
    var prop = result.response.header[0].prop[0].$.value;
    var from = result.response.header[0].from[0].$.value;
    var appId = result.response.header[0].appid[0].$.value;
    var robot = robotManager.getRobot('APP_' + appId);
    
    cache.pget('ss' + sessionid)
        .then(function (value) {
            if (_.isEmpty(value)) {
                var propObj = JSON.parse(prop);
                return cmHelper.loginAppQ(id, '', app_h, appId, message, propObj, function(err, sessionId){});
            }
            var app = value.channelType;
            if (app_h !== app) {
                logger.error('Conversation message is not matched with session data');
            }
            cache.pget(from+appId)
                .then(function (c_value) {
                    //3 way conversation
                    if (c_value.type === 'SHADOW') { // from agent/shadow user to app
                        switch (value.TO) {
                            case 'CUSTOMER':
                                // message sent before pushing to Q, nothing to do here
                                break;
                            case 'AGENT':
                                var new_prop = _.merge(JSON.parse(prop), { msg_to: 'TOAGENT' });
                                msg.sendMessage(robot, value.appAndShadowChannelId, value.realId, { message: '@@APP@@' + message, props: new_prop }, 'MM');
                                break;
                            case 'ALL':
                                var new_prop = _.merge(JSON.parse(prop), { msg_to: 'TOALL' });
                                msg.sendMessage(robot, value.appAndShadowChannelId, value.realId, { message: '@@APP@@' + message, props: new_prop }, 'MM');
                                msg.sendMessage(robot, value.realChannelId, value.realId, { message: message, sessionid: value.sessionId, props: new_prop }, app);
                                break;
                        }
                    } else { // from real customer to app
                        if (value.engagement) {
                            switch (value.TO) {
                                case 'CUSTOMER':
                                    break;
                                case 'AGENT':
                                    var new_prop = _.merge(JSON.parse(prop), { msg_to: 'TOAGENT' });
                                    msg.sendMessage(robot, value.appAndShadowChannelId, value.realId, { message: '@@APP@@' + message, props: new_prop }, 'MM');
                                    break;
                                case 'ALL':
                                    var new_prop = _.merge(JSON.parse(prop), { msg_to: 'TOALL' });
                                    msg.sendMessage(robot, value.appAndShadowChannelId, value.realId, { message: '@@APP@@' + message, props: new_prop }, 'MM');
                                    msg.sendMessage(robot, value.realChannelId, value.realId, { message: message, sessionid: value.sessionId, props: new_prop }, app);
                                    break;
                            }
                        } else {
                            logger.debug('Message to client' + JSON.stringify(message) + '==' + app);
                            msg.sendMessage(robot, value.realChannelId, id, { message: message }, app);
                        }
                    }
                });
        })
        .catch(function (err) {
            logger.error(err);
        });

}