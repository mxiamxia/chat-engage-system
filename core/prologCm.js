/**
 * Created by min on 5/16/16.
 */


var Q = require('q');
var TEMP = require('../common/template');
var logger = require('../common/logger');
var request = require('request');
var config = require('../config');
var xml2js = require('xml2js');
var util = require('util');
var _ = require('lodash');
var cache = require('../common/cache');
var EventProxy = require('eventproxy');
var engageAction = require('./engageAction');

var parser = new xml2js.Parser();
var dispatcher = require('../event/dispatchEvent').pubsub;
var consts = require('../common/consts');
var cmHelper = require('./prologCmHelper');
var sessionDao = require('../dao/').Session;
var msg = require('./message');

var processPrologMessage = function (id, message, robot, socket, self, app, room) {

    var text = message.message;
    var prop = message.prop;

    var ep = new EventProxy();
    if (typeof room == 'undefined' || room == null) {
        //room = 'GENERAL'
        room = id;
    }

    logger.debug('deliver message to room===' + room + ' with ID===' + id);

    ep.fail(function (err) {
        logger.error('Failed to retreive data from Redis server', err);
    });

    //get session info from the Redis cache server
    cache.get(id, function (err, value) {
        if (value) {
            cache.get(value.sessionId, function (err, sessionData) {
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


    ep.all('sessionDataReturn', function (value) {

        logger.debug('cached session value=' + JSON.stringify(value));

        if (cmHelper.cleanCache(room, text, value, robot, self, socket)) {
            return;
        }

        //Shadow Customer only forward message to either App or Agent
        if (robot.adapter.profile.type == 'CUSTOMER') {
            logger.debug('Shadow Custom ID =' + robot.adapter.profile.id);
            if (prop && prop.msg_type === 'leave_engage') {
                dispatcher.emit(robot.adapter.profile.id + 'engageleave', prop);
                return;
            }
            cache.get(robot.adapter.profile.id, function (err, c_value) {
                if (_.isEmpty(c_value)) {
                    return;
                }
                cache.get(c_value.sessionId, function (err, value) {
                    var msgFrom = c_value[id];
                    if (msgFrom === 'AGENT') { //Message came from agent to app
                        logger.debug('Message to shadow customer `came from =' + msgFrom);
                        logger.debug('Message to shadow customer  =' + text);
                        // check if agent try to set engagement mode
                        if (cmHelper.check3Way(prop, text, value)) {
                            if(_.isEmpty(text)) {
                                return;
                            }
                        }
                        // check if agent trys to foward message, pass the whole prop to APP for dispatching
                        if (prop && prop.fwd_to) {
                            // return robot.messageRoom(c_value.appChannelId, {message: text, prop: prop});
                            return msg.sendMessage(robot, socket, c_value.appChannelId, id, {message: text, prop: prop}, true);
                        }
                        // robot.messageRoom(c_value.appChannelId, {message: text});
                        msg.sendMessage(robot, socket, c_value.appChannelId, id, {message: text}, true);
                    } else {  // message come from App to agent
                        logger.debug('Message to shadow customer  =' + text);
                        //if real customer request logout, foward the whole message to agent
                        if (prop && prop.msg_type === 'cust_leave') {
                            // return robot.messageRoom(c_value.agentChannelId, message);
                            return msg.sendMessage(robot, socket, c_value.agentChannelId, id, message, true);
                        }

                        if(text.indexOf('@@CUS@@') === 0) {
                            text = text.substring('@@CUS@@'.length);
                            // return robot.messageRoom(c_value.agentChannelId, {message: text, prop: {msg_from: 'CUST'}});
                            return msg.sendMessage(robot, socket, c_value.agentChannelId, id, {message: text, prop: {msg_from: 'CUST'}}, true);
                        }

                        if(text.indexOf('@@APP@@') === 0) {
                            text = text.substring('@@APP@@'.length);
                            // return robot.messageRoom(c_value.agentChannelId, {message: text, prop: {msg_from: 'APP'}});
                            return msg.sendMessage(robot, socket, c_value.agentChannelId, id, {message: text, prop: {msg_from: 'APP'}}, true);
                        }
                    }
                });
            });
            return;
        }

        if (robot.adapter.profile.type === 'APP') {

            //if agent requests back on engagement answer to APP, app emit to engageAction
            if (!_.isEmpty(prop) && prop.msg_type && prop.session_id) {

                if (prop.msg_type === 'engage_request_answer' ) {
                    logger.debug('Emit engagement event sessinos=' + room + prop.session_id + 'engagerequest');
                    dispatcher.emit(room + prop.session_id + 'engagerequest', prop);
                    return;
                }
            }

            // login Prolog CM if session is not established
            if (_.isEmpty(value) || (prop && prop.msg_type === 'login')) {
                loginAction(id, app, message)
                    .then(function (result) {
                        logger.debug('Prolog CM login output=' + JSON.stringify(result));
                        if (result.code === 1000) {
                            var session = result.session;
                            var statement = result.statement;
                            var customCache = {sessionId: session, type: 'REAL'};
                            var sessionInfo = {
                                'sessionId': session,
                                'realId': id,
                                'realChannelId': room,
                                'appId': robot.adapter.profile.id, 
                                'channelType': app
                            };

                            sessionDao.newAndSave(session, robot.adapter.profile.id, id, function(err, session) {
                                logger.debug('Create new session info into mongo db=' + JSON.stringify(session));
                            });
                            cache.set(id, customCache, config.redis_expire);
                            cache.set(session, sessionInfo, config.redis_expire);
                            msg.sendMessage(robot, socket, room, id, {message: statement, prop: {msg_type: 'login'}, sessionid: session}, self);
                            sendMsgToApp(robot, text, room, sessionInfo, self, socket);
                        }
                    });
                return;
            }


            // when session is established
            // for each message to appAndShadowChannelId(APP to shadow user), we add message_from prefix and add it to props in client.coffee
            if (!_.isEmpty(value)) {
                //if message came from agent and intends to send customer directly
                cache.get(id, function (err, c_value) {
                    // foward message
                    if (prop && prop.fwd_to === 'CM') {
                        return cmHelper.appToAgent(text, value, c_value.type, robot, self, socket);
                    }
                    if (prop && prop.fwd_to === 'CUST') {
                        // return robot.messageRoom(value.realChannelId, {message: text});
                        return msg.sendMessage(robot, socket, value.realChannelId, id, {message: text, sessionid: value.sessionId}, self);
                    }

                    //3 way conversation
                    if (c_value.type === 'SHADOW') {
                        switch (value.TO) {
                            case 'CUSTOMER' :
                                // robot.messageRoom(value.realChannelId, {message: text});
                                msg.sendMessage(robot, socket, value.realChannelId, id, {message: text, sessionid: value.sessionId}, self);
                                break;
                            case 'AGENT' :
                                cmHelper.appToAgent(text, value, c_value.type, robot, self, socket);
                                break;
                            case 'ALL' :
                                cmHelper.appToAll(text, value, c_value.type, robot, self, socket);
                                break;
                        }
                    } else {  // from real customer
                        if (value.engagement) {
                            // Real customer logout/close browser
                            if (prop && prop.msg_type === 'cust_leave') {
                                // return robot.messageRoom(value.appAndShadowChannelId, message);
                                return msg.sendMessage(robot, socket, value.appAndShadowChannelId, id, message, true);
                            }

                            switch (value.TO) {
                                case 'CUSTOMER' :
                                    // robot.messageRoom(value.appAndShadowChannelId, {message: '@@CUS@@' + text});
                                    msg.sendMessage(robot, socket, value.appAndShadowChannelId, id, {message: '@@CUS@@' + text}, true);
                                    break;
                                case 'AGENT' :
                                    cmHelper.appToAgent(text, value, c_value.type, robot, self, socket);  // if type is from real customer, send text and app answer to agent
                                    break;
                                case 'ALL' :
                                    cmHelper.appToAll(text, value, c_value.type, robot, self, socket);
                                    break;
                            }
                        } else {
                            sendMsgToApp(robot, text, room, value, self, socket);
                        }
                    }
                });
            }
        }
    });
};

var loginAction = function (id, app, message) {
    var deferred = Q.defer();
    var prologLogin = TEMP.loginReq;
    if (app.toLowerCase() === 'ivr') {
        prologLogin = util.format(prologLogin, id, message.sessionid);
    } else {
        prologLogin = util.format(prologLogin, id, '');
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


var sendMsgToApp = function (robot, text, room, value, self, socket) {
    cmHelper.sendMsgToApp(value, 'REAL', text)
        .then(function (result) {
            logger.debug('conversation output===' + JSON.stringify(result));
            if (result.code === 9999) {
                // robot.messageRoom(room, {message: 'Did not find a proper answer'});
                msg.sendMessage(robot, socket, room, value.realId, {message: 'Did not find a proper answer', sessionid: value.sessionId}, self);
            }
            else if (result.code === 1801) {
                //clean cache and do login again
                // robot.messageRoom(room, {message: 'The current session expired. Ready to init a new session.'});
                msg.sendMessage(robot, socket, room, value.realId, {message: 'The current session expired. Ready to init a new session.', sessionid: value.sessionId}, self);
                cmHelper.cleanCache('', 'quit', value, robot, self, socket);

            } else {
                // robot.messageRoom(room, {message: result.message});
                msg.sendMessage(robot, socket, room, value.realId, {message: result.message}, self);
            }
        });
};

exports.processPrologMessage = processPrologMessage;
