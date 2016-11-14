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
var cheerio = require('cheerio');
var util = require('util');
var TEMP = require('../common/template');

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
                    transferAccept(message, result);
                    break;
                case 'transfer_leave':
                    break;
                case 'session_clean':
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

    var channel = '';
    if (result.response.header[0].channelid) {
        channel = result.response.header[0].channelid[0].$.value;
    }

    cache.pget('ss' + sessionid)
        .then(function (value) {
            if (_.isEmpty(value)) {
                var propObj = JSON.parse(prop);
                logger.debug('Conversation session lost, login again');
                logger.error('Conversation session lost, login again');
                return;
                // return cmHelper.loginAppQ(id, channel, app_h, appId, {}, propObj, function(err, sessionId){});
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
                                logger.debug('fwd message from CM in customer222');
                                var new_prop = _.merge(JSON.parse(prop), { msg_to: 'TOAGENT' });
                                msg.sendMessage(robot, value.appAndShadowChannelId, value.realId, { message: '@@APP@@' + message, props: new_prop }, 'MM');

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
                                    logger.debug('fwd message from CM in customer');
                                    // var new_prop = _.merge(JSON.parse(prop), { msg_to: 'TOAGENT' });
                                    // msg.sendMessage(robot, value.appAndShadowChannelId, value.realId, { message: '@@APP@@' + message, props: new_prop }, 'MM');
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

var transferAccept = function (message, result) {

    console.log('transfer result=' + JSON.stringify(result));

    if (!result.response.header[0].sessionid) {
        logger.error('session id is not returned');
        return;
    }
    var sessionid = result.response.header[0].sessionid[0].$.value;

    var id;
    var app_h;
    var prop;
    var from;
    var appId;

    if (result.response.header[0].userid) {
        id = result.response.header[0].userid[0].$.value;
    }
    console.log('transfer app1');
    if (result.response.header[0].hasOwnProperty('app')) {
        console.log('transfer app2');
        app_h = result.response.header[0].app[0].$.value;
    }

    if (result.response.header[0].prop) {
        prop = result.response.header[0].prop[0].$.value;
    }
    if (result.response.header[0].from) {
        from = result.response.header[0].from[0].$.value;
    }
    if (result.response.header[0].appid) {
        appId = result.response.header[0].appid[0].$.value;
    }

    var robot = robotManager.getRobot('APP_' + appId);

    cache.pget('ss' + sessionid)
        .then(function (value) {
            if (value.engagement) {
                var new_prop;
                if (prop) {
                    new_prop = _.merge(JSON.parse(prop), { msg_to: 'TOALL' });
                } else {
                    new_prop = { msg_to: 'TOALL' };
                }
                if (!robot) {
                    robot = robotManager.getRobot('APP_' + value.application);
                }
                sendTransferMessage(robot, value.appAndShadowChannelId, value.realId, { message: '@@CUS@@' + message, sessionid: sessionid, props: new_prop });
            } else {
                logger.error('tranfer accept failed, session is not engaged');
            }
        })
        .catch(function (err) {
            logger.error(err);
        })
}

var sendTransferMessage = function (robot, room, id, message) {
    logger.debug('send transfer message to agent=' + JSON.stringify(message));
    var prop = message.props;
    if (prop && prop.audio && prop.audio !== '$audio' && message.message.indexOf('@@CUS@@') === 0) {
        var text = message.message;
        text = text.substring('@@CUS@@'.length);
        var otherCard = "";
        var transferMsg;
        var url = prop.audio;
        var sessionid = message.sessionid || prop.sessionid;
        if (text.indexOf('xul') > -1) {
            text = text.replace(/(\r\n|\n|\\n|\r)/gm, '');
            $ = cheerio.load(text);
            otherCard = $('xul').html();
            logger.debug('Send out the otherCard message=' + otherCard);
            var statement = "";
            if ($('xul').has('statement')) {
                statement = $('statement').text();
                logger.debug('Send out the statement message=' + statement);
            }
            transferMsg = util.format(TEMP.engageAudioCard, sessionid, id, id, otherCard, sessionid, url, statement);
        } else {
            transferMsg = util.format(TEMP.engageAudioCard, sessionid, id, id, otherCard, sessionid, url, text);
        }
        logger.debug('Send out the transfer message=' + transferMsg);
        message.message = '@@CUS@@' + transferMsg;
        robot.messageRoom(room, message);
    } else {
        robot.messageRoom(room, message);
    }
}