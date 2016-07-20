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

var process = function (message) {
    if (_.isEmpty(message)) {
        return;
    }
    parser.parseString(message, function (err, result) {
        try {
            var action = result.response.header[0].action[0].$.value;
            switch (action) {
                case 'login':
                    loginProcess(message, result);
                    break;
                case 'conversation':
                    conversationProcess(message, result);
                    break;
                case '':
                    break;
                default:
                    //
            }
        } catch (err) {
        }
    });
};

exports.process = process;

var loginProcess = function (message, result) {
    var sessionid = result.response.header[0].sessionid[0].$.value;
    var id        = result.response.header[0].userid[0].$.value;
    var app = result.response.header[0].app[0].$.value;
    var channel = result.response.header[0].channel[0].$.value;

    logger.debug('Prolog CM login output=' + JSON.stringify(result));
    var robot = robotManager.getRobot('APP');
    var session = sessionid;
    var customCache = {sessionId: session, type: 'REAL'};
    var sessionInfo = {
        'sessionId': session,
        'realId': id,
        'realChannelId': channel,
        'appId': robot.adapter.profile.id,
        'channelType': app
    };
    sessionDao.newAndSave(session, robot.adapter.profile.id, id, app, function(err, session) {
        logger.debug('Create new session info into mongo db=' + JSON.stringify(session));
    });
    cache.set(id, customCache, config.redis_expire);
    cache.set(session, sessionInfo, config.redis_expire);
    var new_prop = {msg_type: 'login'};
    msg.sendMessage(robot, channel, id, {message: message, prop: new_prop, sessionid: session}, app);
    //TODO: send original text to app
};

var conversationProcess = function (message, result) {
    var sessionid = result.response.header[0].sessionid[0].$.value;
    var id        = result.response.header[0].userid[0].$.value;
    var app_h = result.response.header[0].app[0].$.value;
    var prop = result.response.header[0].prop[0].$.value;
    var from = result.response.header[0].from[0].$.value;
    var robot = robotManager.getRobot('APP');
    cache.pget(sessionid)
        .then(function (value) {
            if (_.isEmpty(value)) {
               return cmHelper.loginAppQ(id, app_h, message);
            }
            var app = value.channelType;
            if (app_h !== app) {
                logger.error('Conversation message is not matched with session data');
            }
            cache.pget(from)
                .then(function (c_value) {
                    //3 way conversation
                    if (c_value.type === 'SHADOW') {  // from agent/shadow user to app
                        switch (value.TO) {
                            case 'CUSTOMER' :
                                // message sent before pushing to Q, nothing to do here
                                break;
                            case 'AGENT' :
                                var new_prop = _.merge(JSON.parse(prop), {msg_to: 'TOAGENT'});
                                msg.sendMessage(robot, value.appAndShadowChannelId, value.realId, {message: '@@APP@@' +result, prop: new_prop}, 'MM');
                                break;
                            case 'ALL' :
                                var new_prop = _.merge(JSON.parse(prop), {msg_to: 'TOALL'});
                                msg.sendMessage(robot, value.appAndShadowChannelId, value.realId, {message: '@@APP@@' + result, prop: new_prop}, 'MM');
                                msg.sendMessage(robot, value.realChannelId, value.realId, {message: result, sessionid: value.sessionId, prop: new_prop}, app);
                                break;
                        }
                    } else {  // from real customer to app
                        if (value.engagement) {
                            switch (value.TO) {
                                case 'CUSTOMER' :
                                    break;
                                case 'AGENT' :
                                    var new_prop = _.merge(JSON.parse(prop), {msg_to: 'TOAGENT'});
                                    msg.sendMessage(robot, value.appAndShadowChannelId, value.realId, {message: '@@APP@@' +result, prop: new_prop}, 'MM');
                                    break;
                                case 'ALL' :
                                    var new_prop = _.merge(JSON.parse(prop), {msg_to: 'TOALL'});
                                    msg.sendMessage(robot, value.appAndShadowChannelId, value.realId, {message: '@@APP@@' + result, prop: new_prop}, 'MM');
                                    msg.sendMessage(robot, value.realChannelId, value.realId, {message: result, sessionid: value.sessionId, prop: new_prop}, app);
                                    break;
                            }
                        } else {
                            msg.sendMessage(robot, value.realChannelId, id, message, app);
                        }
                    }
                });
        })
        .catch(function (err) {

        })

}