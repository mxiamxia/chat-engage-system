/**
 * Created by min on 5/16/16.
 */


var Q = require('q');
var TEMP = require('../common/template');
var logger = require('../common/logger');
var request = require('request');
var config = require('../config');
var xml2js = require ('xml2js');
var util = require ('util');
var _ = require('lodash');
var cache = require('../common/cache');
var EventProxy = require('eventproxy');
var engageAction = require('./engageAction');

var parser = new xml2js.Parser();
var dispatcher = require('../event/dispatchEvent').pubsub;
var consts = require('../common/consts');
var cmHelper = require('./prologCmHelper');

var processPrologMessage = function (id, text, robot, socket, self, room) {

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
      cache.get(value.sessionId, function(err, sessionData) {
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

    if(cmHelper.cleanCache(room, text, value, robot, self, socket)) {
      return;
    }

    //Shadow Customer only forward message to either App or Agent
    if (robot.adapter.profile.type == 'CUSTOMER') {
      logger.debug('Shadow Custom ID =' + robot.adapter.profile.id);
      cache.get(robot.adapter.profile.id, function (err, c_value) {
        if (_.isEmpty(c_value)) {
          return;
        }
        cache.get(c_value.sessionId, function (err, value) {
          var msgFrom = c_value[id];
          if(msgFrom === 'AGENT') { //Message came from agent to app
            logger.debug('Message to shadow customer came from =' + msgFrom);
            logger.debug('Message to shadow customer  =' + text);
            // check if agent try to set engagement mode
            if(cmHelper.check3Way(text, value)) {
              return;
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

    if (robot.adapter.profile.type == 'APP') {
      // login Prolog CM if session is not established
      if (_.isEmpty(value)) {
        loginAction(id, robot)
            .then(function (result) {
              logger.debug('Prolog CM login output=' + JSON.stringify(result));
              if (result.code == 1000) {
                var session = result.session;
                var statement = result.statement;
                var customCache = {'sessionId': session, 'type': 'REAL'};
                var sessionInfo = {
                  'sessionId': session,
                  'realId': id,
                  'realChannelId': room,
                  'appId': robot.adapter.profile.id,
                  'channels': robot.adapter.client.channel_details
                };
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
            if(value.TO === 'CUSTOMER') {
              robot.messageRoom(value.realChannelId, text);
              return;
            }

            if(value.TO === 'AGENT') {
              cmHelper.appToAgent(text, value, c_value, robot, self, socket);
              return;
            }

            if(value.TO === 'ALL') {
              logger.debug('Message to shadow and To ALL');
              cmHelper.appToAll(text, value, c_value.type, robot, self, socket);
              return;
            }
          } else {  // from real customer
            if(value.engagement) {
              if(value.TO === 'CUSTOMER') {
                robot.messageRoom(value.appAndShadowChannelId, text);
                return;
              }

              if(value.TO === 'AGENT') {
                cmHelper.appToAgent(text, value, c_value.type, robot, self, socket);  // if type is from real customer, send text and app answer to agent
                return;
              }

              if(value.TO === 'ALL') {
                cmHelper.appToAll(text, value, c_value.type, robot, self, socket);
              }
            } else {
              cmHelper.sendMsgToApp(value, text)
                  .then(function (result) {
                    logger.debug('conversation output===' + JSON.stringify(result));
                    if (self) {
                      if (result.code == 9999) {
                        robot.messageRoom(room, 'Did not find a proper answer');
                      } else {
                        robot.messageRoom(room, result.message);
                      }
                    } else {
                      if (result.code == 9999) {
                        socket.emit('response', {'userid': id, 'input': 'Did not find a proper answer'});
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
    headers: {'Content-Type' : 'application/xml'}
  };
  request(options, function (err, response, body) {
    if (err) {
      logger.debug('login request err=' + err);
      deferred.resolve({'code': 9999});
    } else {
      logger.debug('login body=' + JSON.stringify(body));
      parser.parseString(body, function(err, result) {
        try{
          var sessionID = result.response.header[0].sessionid[0].$.value;
          var statement = result.response.body[0].statement[0];
          var data = {'session': sessionID, 'statement': statement, 'code': 1000};
          deferred.resolve(data);
        } catch(e) {
          deferred.resolve({'code': 9999});
        }
      });
    }
  });
  return deferred.promise;
};

var conversationAction = function (value, sentence) {
  addCacheData(value.sessionId, consts.ANSWER, sentence);
  var deferred = Q.defer();
  var input = util.format (TEMP.conversationReq, value.sessionId, value.realId, sentence);
  logger.debug('Prolog CM conversation input===' + input);
  var options = {
    uri: config.CM_PROLOG,
    method: 'POST',
    qs: {request: input},
    headers: {'Content-Type' : 'application/xml'}
  };
  request (options, function (err, response, body) {
    if (err) {
      logger.debug ('conversation request err=' + err);
    }
    logger.debug('Prolog CM conversation output=' + body);
    if(body.indexOf('<xul>') > -1) {
      body = body.replace(/\r?\n|\r/g, '');
      deferred.resolve({'type': 'xul', 'message': body, 'code': 1000});
      addCacheData(value.sessionId, consts.QUESTION, body);
    } else {
      parser.parseString(body, function(err, result) {
        try{
          var statement = 'no valid answer returned';
          if(_.isEmpty(result.response.body[0].question)) {
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
          addCacheData(value.sessionId, consts.QUESTION, statement);
          deferred.resolve(data);
        } catch(e) {
          deferred.resolve({'code': 9999});
        }
      });
    }
  });
  return deferred.promise;
};

var addCacheData = function (id, key, value) {
  if(key === consts.QUESTION && value ==='I don\'t understand.') {
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


var postMessage = function (id, self, robot, socket, message) {
  if (id.indexOf('@@') > -1) {
    id = id.substring(0, id.indexOf('@@'));
  }

  if (self) {
    logger.debug('engage message self=' + id + '||' + message);
    robot.messageRoom(id, message);
  } else {
    logger.debug('engage message=' + id + '||' + message);
    socket.emit('response', {'userid': id, 'input': message});
  }
}

exports.processPrologMessage = processPrologMessage;
