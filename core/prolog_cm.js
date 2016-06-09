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

var parser = new xml2js.Parser();
var dispatcher = require('../event/dispatchEvent').pubsub;
var consts = require('../common/consts');

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

  cache.get(id, function (err, value) {
    ep.emit('sessionReturned', value);
  });

  ep.all('sessionReturned', function (value) {
    logger.debug('cached session value=' + JSON.stringify(value));

    // only when engagement setup, allow agent to set engagement mode
    if(value && value.engagement && value.engagementAgent) {
      if (text === '@@toall') {
        value.TO = 'ALL';
        cache.set(id, value, config.redis_expire);
        return;
      } else if (text === '@@toagent') {
        value.TO = 'AGENT';
        cache.set(id, value, config.redis_expire);
        return;
      } else if (text == '@@tocustomer') {
        value.TO = 'CUSTOMER';
        cache.set(id, value, config.redis_expire);
        return;
      }
    }

    if (text.toLowerCase() === 'quit') {
      if (!_.isEmpty(value)) {
        //TODO:
        if(value.engagement) {
          //cache.get(id, function(value) {
          //  var keys = Object.keys(value);
          //  keys.forEach(function(key) {
          //    delete value[key].engagement;
          //  });
          //});
          cache.remove(id);
        } else {
          cache.remove(id);
        }
      }
      if (self) {
        robot.messageRoom(room, 'Session is terminated');
      }
      else {
        socket.emit('response', {'userid': id, 'input': 'Session is terminated'});
      }
    }
    else if (!_.isEmpty(value)) {
      conversationAction(id, value, text)
        .then(function (result) {
          logger.debug('conversation output===' + JSON.stringify(result));
          if (value.engagement) {
            logger.debug('In process of engagement=' + value.engageWith);
            robot.messageRoom(value.engageWithRoom, result.message);  //to customer
            robot.messageRoom(room, result.message);   //to self
            return;
          }
          if (self) {
            if(result.code == 9999) {
              robot.messageRoom(room, 'Did not find a proper answer');
            } else {
              robot.messageRoom(room, result.message);
            }
          } else {
            if(result.code == 9999) {
              socket.emit('response', {'userid': id, 'input': 'Did not find a proper answer'});
            } else {
              socket.emit('response', {'userid': id, 'input': result.message});
            }
          }
        });
    }
    else {
      loginAction(id, robot)
        .then(function (result) {
          logger.debug('prolog login result===' + JSON.stringify(result));
          if(result.code == 1000) {
            var session = result.session;
            var statement = result.statement;
            cache.set(id, {'sessionid': session, 'room': room, 'channels': robot.adapter.client.channel_details}, config.redis_expire);
            if (self) {
              robot.messageRoom(room, statement);
            } else {
              socket.emit('response', {'userid': id, 'input': statement});
            }
          }
          //only monitor the id that emit the engage event register when id login successfully
          dispatcher.on(id, function (data) {
            logger.debug('engagement data===' + JSON.stringify(data));
            var userid = data.userid;
            var agentid = data.agentid;
            var sessionid = data.sessionid;
            var channelId = data.channelId;
            cache.get(userid, function(err, cached) {
              logger.debug('engagemnt cache ====' + JSON.stringify(cached));
              var q = consts.QUESTION;
              var a = consts.ANSWER;
              if(!_.isEmpty(cached[q])) {
                var question = cached[q];
                postMessage(channelId, self, robot, socket, question);
              }
              if(!_.isEmpty(cached[a])) {
                var answer = cached[a];
                postMessage(channelId, self, robot, socket, answer);
              }
              cached.engageWith = agentid;
              cached.engageWithRoom = channelId;
              cached.engagement = true;
              cached.engagementCustomer = true;
              cache.set(userid, cached, config.redis_expire);
              // have one agent support multiple engagement
              cache.get(agentid, function (value) {
                //if (value) {
                //
                //} else {
                //
                //}
                cache.set(agentid, {'engagement': true, 'engageWithRoom': cached.room, 'sessionid': sessionid , 'engagementAgent': true}, config.redis_expire);

              });
            });
          });
        });
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

var conversationAction = function (id, value, sentence) {
  addCacheData(id, consts.ANSWER, sentence);
  var deferred = Q.defer();
  var input = util.format (TEMP.conversationReq, value.sessionid, id, sentence);
  logger.debug('prolog conversation input===' + input);
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
    logger.debug('conversation body=' + body);
    if(body.indexOf('<xul>') > -1) {
      deferred.resolve({'type': 'xul', 'message': body, 'code': 1000});
      addCacheData(id, consts.QUESTION, body);
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
          var data = {'type': 'message', 'message': statement, 'code': 1000};
          addCacheData(id, consts.QUESTION, statement);
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
