/**
 * Created by min on 5/16/16.
 */


var logger = require('../common/logger');
var config = require('../config');
var xml2js = require('xml2js');
var util = require('util');
var _ = require('lodash');
var cache = require('../common/cache');
var EventProxy = require('eventproxy');
var engageAction = require('./engageAction');
var dispatcher = require('../event/dispatchEvent').pubsub;
var cmHelper = require('./prologCmHelper');
var msg = require('./message');
var robotManager = require('./robotManager');

var processPrologMessage = function(id, message, robot, app, room) {

    var text = message.message;
    var prop = message.props;

    if (typeof prop === 'string') {
        prop = JSON.parse(prop);
    }

    if (prop && prop.audio && !_.isEmpty(prop.audio) && _.isEmpty(text)) {
        logger.debug('the input text is empty');
        return;
    }

    var ep = new EventProxy();
    if (typeof room === 'undefined' || room === null) {
        room = id;
    }

    logger.debug('deliver message to room===' + room + ' with ID===' + id);
    logger.debug('deliver message ===' + JSON.stringify(message));

    ep.fail(function(err) {
        logger.error('Failed to retreive data from Redis server', err);
    });

    //get session info from the Redis cache server
    cache.get(id+robot.adapter.profile.appId, function(err, value) {
        if (value) {
            cache.get('ss' + value.sessionId, function(err, sessionData) {
                if (sessionData) {
                    ep.emit('sessionDataReturn', sessionData);
                } else {
                    ep.emit('sessionDataReturn', null);
                }
            });
        } else {
            ep.emit('sessionDataReturn', null);
        }
    });

    ep.all('sessionDataReturn', function(value) {

        logger.debug('cached session value=' + JSON.stringify(value));

        if (cmHelper.cleanCache(room, text, value, robot, app)) {
            return;
        }

        //Shadow Customer only forward message to either App or Agent
        if (robot.adapter.profile.type == 'CUSTOMER') {
            logger.debug('Shadow Custom ID =' + robot.adapter.profile.id);
            if (prop && prop.msg_type === 'leave_engage') {
                dispatcher.emit(robot.adapter.profile.id + 'engageleave', prop);
                return;
            }
            cache.get(robot.adapter.profile.id+robot.adapter.profile.appId, function(err, c_value) {
                if (_.isEmpty(c_value)) {
                    logger.error('Can not get shadow user session data');
                    return;
                }
                cache.get('ss' + c_value.sessionId, function(err, value) {
                    var msgFrom = c_value[id];
                    if (msgFrom === 'AGENT') { //Message came from agent to app
                        logger.debug('Message to shadow customer `came from =' + msgFrom);
                        // check if agent try to set engagement mode
                        if (cmHelper.check3Way(prop, text, value)) {
                            if (_.isEmpty(text)) {
                                return;
                            }
                        }
                        // check if agent trys to foward message, pass the whole prop to APP for dispatching
                        if (prop && prop.fwd_to) {
                            return msg.sendMessage(robot, c_value.appChannelId, id, { message: text, props: prop }, 'MM');
                        }
                        msg.sendMessage(robot, c_value.appChannelId, id, { message: text }, 'MM');
                    } else { // message come from App to agent
                        //if real customer request logout, foward the whole message to agent
                        if (prop && prop.msg_type === 'cust_leave') {
                            msg.sendMessage(robot, c_value.agentChannelId, id, message, 'MM');
                            var appId = value.application;
                            var appRobot = robotManager.getRobot('APP_' + appId);
                            return cmHelper.cleanCache('', 'quit', value, appRobot, app);
                        }

                        if (text.indexOf('@@CUS@@') === 0) {
                            text = text.substring('@@CUS@@'.length);
                            // return robot.messageRoom(c_value.agentChannelId, {message: text, prop: {msg_from: 'CUST'}});
                            var new_prop = _.merge(prop, { msg_from: 'CUST' });
                            return msg.sendMessage(robot, c_value.agentChannelId, id, { message: text, props: new_prop }, 'MM');
                        } else if (text.indexOf('@@APP@@') === 0) {
                            text = text.substring('@@APP@@'.length);
                            // return robot.messageRoom(c_value.agentChannelId, {message: text, prop: {msg_from: 'APP'}});
                            var new_prop = _.merge(prop, { msg_from: 'APP' });
                            return msg.sendMessage(robot, c_value.agentChannelId, id, { message: text, props: new_prop }, 'MM');
                        } else {
                            logger.error('no msg from was defined');
                            return msg.sendMessage(robot, c_value.agentChannelId, id, { message: text, props: new_prop }, 'MM');
                        }
                    }
                });
            });
            return;
        }

        if (robot.adapter.profile.type === 'APP') {

            //if agent requests back on engagement answer to APP, app emit to engageAction
            if (!_.isEmpty(prop) && prop.msg_type && prop.session_id) {
                if (prop.msg_type === 'engage_request_answer') {
                    logger.debug('Emit engagement event sessinos=' + room + prop.session_id + 'engagerequest');
                    dispatcher.emit(room + prop.session_id + 'engagerequest', prop);
                    return;
                }
            }

            // login Prolog CM if session is not established
            if (_.isEmpty(value) || (prop && prop.msg_type === 'login') || value.application !== robot.adapter.profile.appId) {
                var appid = robot.adapter.profile.appId;
                cmHelper.loginAppQ(id, room, app, appid, message, prop, function (err, sessionId) {
                    // cmHelper.sendMsgToAppQ(id, {realId: id, sessionId: sessionId, channelType: app}, 'REAL', robot.adapter.profile.appId, prop, text);
                });
                return;
            }

            // when session is established
            // for each message to appAndShadowChannelId(APP to shadow user), we add message_from prefix and add it to props in client.coffee
            if (!_.isEmpty(value)) {
                //if message came from agent and intends to send customer directly
                cache.get(id+value.application, function(err, c_value) {
                    logger.debug('user id session=' + JSON.stringify(c_value));
                    if (err || _.isEmpty(c_value)) {
                        logger.debug('Failed to get incoming id session data');
                        return;
                    }
                    // foward message
                    if (prop && prop.fwd_to === 'CM') {
                        return cmHelper.appToAgent(id, text, prop, value, c_value.type, robot);
                    }
                    if (prop && prop.fwd_to === 'CUST') {
                        return msg.sendMessage(robot, value.realChannelId, id, { message: text, sessionid: value.sessionId }, app);
                    }

                    //3 way conversation
                    if (c_value.type === 'SHADOW') { // from agent/shadow user to app
                        switch (value.TO) {
                            case 'CUSTOMER':
                                msg.sendMessage(robot, value.realChannelId, id, { message: text, sessionid: value.sessionId }, app);
                                break;
                            case 'AGENT':
                                cmHelper.appToAgent(id, text, prop, value, c_value.type, robot);
                                break;
                            case 'ALL':
                                cmHelper.appToAll(id, text, prop, value, c_value.type, robot);
                                break;
                        }
                    } else { // from real customer to app
                        if (value.engagement) {
                            // Real customer logout/close browser
                            if (prop && prop.msg_type === 'cust_leave') {
                                return msg.sendMessage(robot, value.appAndShadowChannelId, id, message, 'MM');
                                // return cmHelper.cleanCache('', 'quit', value, robot, app);
                            }
                            switch (value.TO) {
                                case 'CUSTOMER':
                                    var new_prop = _.merge(prop, { msg_to: 'TOAGENT' });
                                    msg.sendMessage(robot, value.appAndShadowChannelId, id, { message: '@@CUS@@' + text, props: new_prop }, 'MM');
                                    break;
                                case 'AGENT':
                                    var new_prop = _.merge(prop, { msg_to: 'TOAGENT' });
                                    msg.sendMessage(robot, value.appAndShadowChannelId, id, { message: '@@CUS@@' + text, props: new_prop }, 'MM'); // when engage set to CM, customer will only send message to agent but not CM
                                     // cmHelper.appToAgent(id, text, prop, value, c_value.type, robot); // if type is from real customer, send text and app answer to agent
                                    break;
                                case 'ALL':
                                    cmHelper.appToAll(id, text, prop, value, c_value.type, robot);
                                    break;
                            }
                        } else {
                            if (prop && prop.msg_type === 'cust_leave') {
                                cmHelper.cleanCache('', 'quit', value, robot, app);
                                return;
                            }
                            cmHelper.sendMsgToAppQ(id, value, 'REAL', robot.adapter.profile.appId, prop, text);
                        }
                    }
                });
            }
        }
    });
};

exports.processPrologMessage = processPrologMessage;