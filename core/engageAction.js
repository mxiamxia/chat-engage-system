/**
 * Created by min on 5/26/16.
 */

var xml2js = require('xml2js');
var template = require('../common/template');
var util = require('util');
var _ = require('lodash');
var dispatcher = require('../event/dispatchEvent').pubsub;
var consts = require('../common/consts');
var logger = require('../common/logger');
var config = require('../config');
var cache = require('../common/cache');
var parser = new xml2js.Parser();
var robotManager = require('./robotManager');
var initHubot = require('../bots/botInstance');
var mattermostApi = require('../api/mattermostApi');
var EventProxy = require('eventproxy');
var engageApi = require('./engageApi');
var sessionDao = require('../dao/').Session;
var async = require('async');
var msg = require('./message');

var appIdList = config.APPLIST;

var sessionEngaged = [];

var transferStart = function (input) {
    if (!_.isEmpty(input)) {
        parser.parseString(input, function (err, result) {
            if (err) {
                //TODO: err
                logger.debug('Engagement failed, transfer request is not valid');
                return;
            }
            logger.debug('Engagement request json=' + JSON.stringify(result));
            if (result && result.message && result.message.header && result.message.header[0].action) {
                var action = result.message.header[0].action[0].$.value;
                if (action === 'transfer_start') {
                    var sessionid = result.message.header[0].sessionid[0].$.value;
                    var userid = result.message.header[0].userid[0].$.value;
                    cache.getSessionById(userid, function (err, sessionData) {
                        if (err || _.isEmpty(sessionData)) {
                            logger.debug('Engagement failed, session data is not found');
                            return;
                        }

                        if (!sessionData && sessionData.sessionId !== sessionid) {
                            logger.debug('Engagement failed, session id from request does not match customer session id');
                            return;
                        }

                        //clean session record -- temporary fixing
                        if (sessionEngaged.indexOf(sessionid) < 0) {
                            sessionEngaged.push(sessionid);
                        } else {
                            logger.debug('Prolog CM sent duplicate engagements session ID = ' + sessionid);
                            return;
                        }

                        var ep = new EventProxy();
                        var appRobot = robotManager.getRobot('APP');

                        ep.all(sessionid + 'accept', function (agentId) {
                            logger.debug('Agent accepted the engagement');
                            var shadowName = 'shadow_' + appRobot.adapter.profile.id + '_' + userid;
                            var shadowEmail = shadowName + '@cyberobject.com';
                            createShadowUser(shadowEmail, '123456', shadowName, function (err, response) {
                                logger.debug('Init new mattermost user' + JSON.stringify(response));
                                // if create shadow customer successfully
                                if ((response.message === 'An account with that username already exists.' || response.message === 'An account with that email already exists.')
                                    || (response.username && (response.username.toLowerCase() === shadowName.toLowerCase()))) {
                                    //Login shadow customer with email and password
                                    initHubot(shadowEmail, '123456', 'CUSTOMER', function (err, robot) {
                                        if(err) {
                                            logger.debug('Init hubot error=' + err);
                                        }
                                        var appId = sessionData.appId;
                                        //logger.debug('Engagement Channel Info=' + JSON.stringify(robot.adapter.client.channel_details));
                                        //TODO: make here parallel processing - DONE
                                        async.parallel([
                                            function(cb){getChannelIdById(agentId, robot, cb)},
                                            function(cb){getChannelIdById(appId, robot, cb)}
                                        ], function (err, results) {
                                            if (err) {
                                                logger.debug('Failed to get channel id error=' + err);
                                                return;
                                            }
                                            var agentChannelId = results[0];
                                            var appChannelId = results[1];
                                            engageApi.engageAccept(sessionid, agentId, function (err, res_value) {
                                                if (err) {
                                                    sendEngagementMessages('Failed to retrieve engagement message from CM', agentChannelId, robot);
                                                } else {
                                                    logger.debug('Engagement Accepted result= ' + res_value);
                                                    sendEngagementMessages(res_value, agentChannelId, robot);
                                                }
                                            });
                                            //processEngagement(userid, agentChannelId, agentId, sessionid);
                                            var customerShadowCache = {
                                                'sessionId': sessionid,
                                                'agentChannelId': agentChannelId,
                                                'appChannelId': appChannelId,
                                                'type': 'SHADOW'
                                            };
                                            customerShadowCache[agentId] = 'AGENT';
                                            customerShadowCache[appId] = 'APP';
                                            var sessionDataTmp = _.clone(sessionData);
                                            sessionData.agentId = agentId;
                                            sessionData.TO = 'ALL';
                                            sessionData.shadowCustId = robot.adapter.profile.id;
                                            sessionData.appAndShadowChannelId = appChannelId;
                                            sessionData.engagement = true;
                                            //cache.pipeline().set(robot.adapter.profile.id, customerShadowCache, config.redis_expire).set(sessionid, sessionData, config.redis_expire).exec();
                                            cache.set(robot.adapter.profile.id, customerShadowCache, config.redis_expire);
                                            cache.set(sessionid, sessionData, config.redis_expire);
                                            robotManager.setRobot(sessionData.shadowCustId, robot);
                                            ep.unbind();
                                            //sendEngagementMessages(sessionData, agentChannelId, robot);

                                            sessionDao.updateSession(sessionid, true, true, agentId, function (err, session) {
                                                logger.debug('Update the session info mongodb');
                                            });
                                            //notify app get shadowCustomChannel ID
                                            //dispatcher.emit(userid, sessionData);

                                            //Agent leaves the engagement process
                                            dispatcher.once(sessionData.shadowCustId + 'engageleave', function () {
                                                //restore session data to before engagement state
                                                cache.set(sessionid, sessionDataTmp, config.redis_expire);
                                                cache.remove(robot.adapter.profile.id);
                                                engageApi.engageLeave(sessionid, agentId, function (err, body) {
                                                    logger.debug('Prolog CM engage leave response=' + JSON.stringify(body));
                                                });
                                                logoutShadowUser(robot, function (err, body) {
                                                    logger.debug('Logout shadow user response=' + JSON.stringify(body));
                                                });

                                                // robot.messageRoom(agentChannelId, {message:'Leave the engagement chat'});
                                                msg.sendMessage(robot, null, agentChannelId, userid, {message:'Leave the engagement chat'}, true);

                                                //clean session record -- temporary fixing
                                                sessionEngaged.splice(sessionEngaged.indexOf(sessionid), 1);
                                            });

                                        });
                                    });
                                } else {
                                    //TODO: if create shadow user failed
                                    ep.unbind();
                                    return;
                                }
                            });
                        });

                        ep.all(sessionid + 'reject', function (agentList) {
                            logger.debug('Agent rejected engage! Finding another agent');
                            logger.debug('Available engagement agent list length=' + agentList.length);
                            for (var i = 0; i < agentList.length; i++) {
                                logger.debug('Engagement agent found=' + JSON.stringify(agentList[i]));
                            }
                            if (agentList.length === 0) {
                                logger.debug('No available engagement agent found');
                                ep.unbind(); //to avoid the same session id trigger multiple accept event later
                                sessionEngaged.splice(sessionEngaged.indexOf(sessionid), 1);
                                sessionDao.updateSession(sessionid, true, false, '', function (err, session) {
                                    logger.debug('Update the session info mongo db reject =' + JSON.stringify(session));
                                });
                                return;
                            }
                            // find next available agent
                            sendEngagement(agentList, appRobot, sessionid, ep);
                        });

                        //First time engagement
                        getAvailableAgentList(appRobot, function (err, list) {
                            logger.debug('Available engagement agent list length=' + list.length);
                            if (list.length === 0) {
                                logger.debug('No available engagement agent found');
                                ep.emit(sessionid + 'reject', []);
                                return;
                            }
                            sendEngagement(list, appRobot, sessionid, ep);
                        });
                    });
                }
            }
        });
    }
}

var createShadowUser = function (email, password, name, cb) {
    mattermostApi.createUser(email, password, name, cb);
};

var logoutShadowUser = function (robot, cb) {
    logger.debug('robot command length=' + robot.commands.length);
    logger.debug('robot listener length=' + robot.listeners.length);
    robot.listeners = [];  // remove message listener in Hubot
    robot.commands = [];
    var token = robot.adapter.client.token;
    mattermostApi.logoutUser(token, cb);
}

var sendEngagementMessages = function (text, channelId, robot) {
    // robot.messageRoom(channelId, {message:text});
    msg.sendMessage(robot, null, channelId, 'id', {message:text}, true);
    //var q = consts.QUESTION;
    //var a = consts.ANSWER;
    //
    //if (!_.isEmpty(sessionData[q])) {
    //    var question = sessionData[q];
    //    robot.messageRoom(channelId, question);
    //}
    //if (!_.isEmpty(sessionData[a])) {
    //    var answer = sessionData[a];
    //    robot.messageRoom(channelId, answer);
    //}
};


var sendEngagement = function (list, appRobot, sessionid, ep) {

    sendEngagementRequest(list, appRobot, sessionid, function (err, data) {
        //add timeout event if no response from agent with 30 seconds
        var timerId = setEngagementTimer(sessionid, ep);
        ep.all(sessionid + 'timeout', function () {
            logger.debug('Agent does not response engagement in 30 seconds and list=' + list.length + '==' + data.agentIdx);
            logger.debug('Agent does not response engagement in 30 seconds=' + data.agentId);
            //appRobot.messageRoom(data.agentChannelId, 'engage_request_claim'+sessionid);
            // appRobot.messageRoom(data.agentChannelId, {message:'', prop:{msg_type: 'engage_request_claim', session_id: sessionid, msg_from: 'APP'}});
            msg.sendMessage(appRobot, null, data.agentChannelId, 'id', {message:'', prop:{msg_type: 'engage_request_claim', session_id: sessionid, msg_from: 'APP'}}, true);
            clearTimeout(timerId);
            ep.unbind(sessionid + 'timeout');
            list.splice(data.agentIdx, 1);
            ep.emit(sessionid + 'reject', list);
        });

        logger.debug('Register engagement event data=' + JSON.stringify(data));
        logger.debug('Register engagement event sessinos=' + data.agentChannelId + sessionid + 'engagerequest');
        dispatcher.once(data.agentChannelId + sessionid + 'engagerequest', function (engage_data) {
            logger.debug('Received engagement response from agent=' + JSON.stringify(engage_data));
            if (engage_data.msg_type === 'engage_request_answer' && engage_data.answer == 'accept') {
                logger.debug('Agent accept engagement=' + sessionid + ', agentId=' + data.agentId);
                clearTimeout(timerId);
                ep.unbind(sessionid + 'timeout');
                ep.emit(sessionid + 'accept', data.agentId);
                return;
            }

            if (engage_data.msg_type === 'engage_request_answer' && engage_data.answer == 'reject') {
                logger.debug('Agent reject engagement=' + sessionid);
                clearTimeout(timerId);
                ep.unbind(sessionid + 'timeout');
                list.splice(data.agentIdx, 1);
                ep.emit(sessionid + 'reject', list);
                return;
            }
        });
    });
}

var sendEngagementRequest = function (agentList, appRobot, sessionId, cb) {
    //var agentIdx = getMember(agentList);
    var agentIdx = 0;
    var member = agentList[agentIdx];
    var availAgentId = member.id;
    getChannelIdById(availAgentId, appRobot, function (err, agentChannelId) {
        sendEngageAccept(agentChannelId, sessionId, appRobot);
        var data = {agentId: availAgentId, agentChannelId: agentChannelId, agentIdx: agentIdx};
        cb(null, data);
    });
};

var getAvailableAgentList = function (appRobot, cb) {
    getAgentList(appRobot, function (err, result) {
        logger.debug('Available Engagement Agent List=' + result);
        result = JSON.parse(result);
        var members = result.members;
        members = members.filter(function (member) {
            return appIdList.indexOf(member.id) < 0;
        });
        logger.debug('Available Engagement Agent List after filter=' + result.length);
        cb(null, members);
    });
};

var sendEngageAccept = function (agentChannelId, sessionId, appRobot) {
    //appRobot.messageRoom(agentChannelId, 'engage_request_message'+sessionId);
    // appRobot.messageRoom(agentChannelId, {message:'', prop:{msg_type: 'engage_request', session_id: sessionId, msg_from: 'APP'}});
    msg.sendMessage(appRobot, null, agentChannelId, 'id', {message:'', prop:{msg_type: 'engage_request', session_id: sessionId, msg_from: 'APP'}}, true);
};


var setEngagementTimer = function (sessionid, ep) {
    var timerId = setTimeout(function () {
        ep.emit(sessionid + 'timeout');
    }, 30000);
    return timerId;
}

var getAvailableAgent = function (callback) {
    //TODO: get available online agents from Mattermost
    getAgentList(robotManager.getRobot('APP'), function (err, result) {
        logger.debug('Available Engagement Agent List=' + result);
        result = JSON.parse(result);
        var members = result.members;
        if (members.length > 0) {
            var availAgentId = getMember(members);
            logger.debug('Available Engagement Agent id=' + availAgentId);
            callback(null, availAgentId);
        } else {
            callback(new Error('no available agent found'));
        }
    });
    //var channel = getChannel(data);
    //logger.debug( 'channel=' + JSON.stringify (channel));
    //var channelId = '';
    //var agentId = '';
    //if (config.ENGAGE_MODE === 'TEST') {
    //  channelId = '7j9h95k68idu8xezh9ybamiisc';
    //  agentId = 'dmg5m3mwytgyfpy8hscp4i7h3c';
    //} else {
    //  if(channel.name.indexOf('__') > -1) {
    //    var pair = channel.name.split('__');
    //    agentId = pair[0];
    //  }
    //  channelId = channel.channelId;
    //}
    //callback(null, channelId, agentId);
}

var getRandomInt = function (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

var getMember = function (data) {
    var radomIdx = getRandomInt(0, data.length);
    var member = data[radomIdx];

    if (member && appIdList.indexOf(member.id) === -1) {
        return radomIdx;
    }
    return getMember(data);
}

var getAgentList = function (robot, cb) {
    var token = robot.adapter.client.token;
    var teamId = robot.adapter.client.teamID;
    mattermostApi.getEngagementAgentList(teamId, token, cb);
}

var getChannelIdById = function (id, robot, cb) {
    var found = false;
    var data = robot.adapter.client.channel_details;
    for (var i = 0; i < data.length; i++) {
        var channel = data[i];
        if (channel && channel.type === 'D') {
            if (channel.name.indexOf('__') > -1) {
                var pair = channel.name.split('__');
                if (id === pair[0]) {
                    found = true;
                    cb(null, channel.id);
                    return;
                }
                if (id === pair[1]) {
                    found = true;
                    cb(null, channel.id);
                    return;
                }
            }
        }
    }
    if (!found && robot.adapter.client.token) {
        var token = robot.adapter.client.token;
        var teamId = robot.adapter.client.teamID;
        mattermostApi.createChannelId(id, token, teamId, function (err, response) {
            logger.debug('Create shadow user channel Id= ' + JSON.stringify(response));
            if (response.id) {
                cb(null, response.id);
            } else {
                cb(new Error('Create new channel Id failed'));
            }
        });
    }
};

exports.transferStart = transferStart;
exports.getChannelIdById = getChannelIdById;
exports.logoutShadowUser = logoutShadowUser;
