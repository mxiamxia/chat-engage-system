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

var processPrologMessage = function (id, message, robot, socket, self, room) {

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
            if (prop.msg_type === 'leave_engage') {
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
                            //TODO:
                            if(_.isEmpty(text)) {
                                return;
                            }
                        }
                        robot.messageRoom(c_value.appChannelId, text);

                    } else {  // message come from App to agent
                        logger.debug('Message to shadow customer came from =' + msgFrom);
                        logger.debug('Message to shadow customer  =' + text);
                        robot.messageRoom(c_value.agentChannelId, text);
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
            if (_.isEmpty(value)) {
                loginAction(id, robot)
                    .then(function (result) {
                        logger.debug('Prolog CM login output=' + JSON.stringify(result));
                        if (result.code == 1000) {
                            var session = result.session;
                            var statement = result.statement;
                            var customCache = {sessionId: session, type: 'REAL'};
                            var sessionInfo = {
                                'sessionId': session,
                                'realId': id,
                                'realChannelId': room,
                                'appId': robot.adapter.profile.id
                            };

                            sessionDao.newAndSave(session, robot.adapter.profile.id, id, function(err, session) {
                                logger.debug('Create new session info into mongo db=' + JSON.stringify(session));
                            });
                            cache.set(id, customCache, config.redis_expire);
                            cache.set(session, sessionInfo, config.redis_expire);
                            if (self) {
                                robot.messageRoom(room, statement);
                            } else {
                                socket.emit('response', {'userid': id, 'input': statement});
                            }
                        }

                        //store shadow custom channel ID when shadow custom established
                        //dispatcher.on(id, function (data) {
                        //  logger.debug('new shadow custom id=' + data.shadowCustId + '----' +robot.adapter.profile.type);
                        //  robot.adapter.client.loadUsersList();
                        //  dispatcher.on('refreshChannel', function () {
                        //    logger.debug('new shadow custom channel=' + JSON.stringify(robot.adapter.client.channel_details));
                        //    var shadowCustChannelId = engageAction.getChannelIdById(data.shadowCustId, robot.adapter.client.channel_details);
                        //    data.shadowCustChannelId = shadowCustChannelId;
                        //    cache.set(data.sessionId, data, config.redis_expire);
                        //  });
                        //});
                    });
                return;
            }


            // when session is established
            if (!_.isEmpty(value)) {
                //if message came from agent and intends to send customer directly
                cache.get(id, function (err, c_value) {
                    if (c_value.type === 'SHADOW') {
                        switch (value.TO) {
                            case 'CUSTOMER' :
                                robot.messageRoom(value.realChannelId, text);
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
                            switch (value.TO) {
                                case 'CUSTOMER' :
                                    robot.messageRoom(value.appAndShadowChannelId, text);
                                    break;
                                case 'AGENT' :
                                    cmHelper.appToAgent(text, value, c_value.type, robot, self, socket);  // if type is from real customer, send text and app answer to agent
                                    break;
                                case 'ALL' :
                                    cmHelper.appToAll(text, value, c_value.type, robot, self, socket);
                                    break;
                            }
                        } else {
                            cmHelper.sendMsgToApp(value, 'REAL', text)
                                .then(function (result) {
                                    logger.debug('conversation output===' + JSON.stringify(result));
                                    if (self) {
                                        if (result.code === 9999) {
                                            robot.messageRoom(room, 'Did not find a proper answer');
                                        }
                                        else if (result.code === 1801) {
                                            //clean cache and do login again
                                            robot.messageRoom(room, 'The current session expired. Ready to init a new session.');
                                            cmHelper.cleanCache('', 'quit', value, robot, self, socket);

                                        } else {
                                            robot.messageRoom(room, result.message);
                                        }
                                    } else {
                                        if (result.code == 9999) {
                                            socket.emit('response', {
                                                'userid': id,
                                                'input': 'Did not find a proper answer'
                                            });
                                        } else {
                                            socket.emit('response', {'userid': id, 'input': result.message});
                                        }
                                    }
                                });
                        }
                    }
                });
            }
        }
    });
};


var loginAction = function (id) {
    var deferred = Q.defer();
    var prologLogin = TEMP.loginReq;
    prologLogin = util.format(prologLogin, id);
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
                    var statement = result.response.body[0].statement[0];
                    var data = {'session': sessionID, 'statement': statement, 'code': 1000};
                    deferred.resolve(data);
                } catch (e) {
                    deferred.resolve({'code': 9999});
                }
            });
        }
    });
    return deferred.promise;
};


exports.processPrologMessage = processPrologMessage;
