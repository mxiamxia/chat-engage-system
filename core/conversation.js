var Q = require('q');
var config = require('../config');
var cache = require('../common/cache');
var logger = require('../common/logger');
var EventProxy = require('eventproxy');
var TEMP = require('../common/template');
var request = require('request');
var poll = require('../common/poll');
var tempTable = require('../common/intervalTbl');
var cheerio = require('cheerio');
var houndy = require('../common/houndify');
var xulUtils = require('../common/xulUtils');
var fs = require('fs');
var _ = require('lodash');


var NTEL_CM = true;

var loginAction = function () {
  var deferred = Q.defer();
  logger.debug('login input=' + JSON.stringify(TEMP.cmLogin));
  logger.debug('login url=' + config.CM_URL);
  var loginInput = TEMP.cmLogin;
  if(!NTEL_CM) {
    loginInput.body.appid = 'ntelagent';   //ntelagent equals GCAS here
  } else {
    loginInput.body.appid = 'maingui';
  }
  var options = {
    uri: config.CM_URL,
    method: 'POST',
    json: TEMP.cmLogin
  };
  request(options, function (err, response, body) {
    logger.debug('login http status code=' + response.statusCode);
    if (err || response.statusCode !== 200) {
      logger.debug('login request err=' + err);
      deferred.resolve('Login fail');
      return deferred.promise;
    } else {
      logger.debug('login body=' + JSON.stringify(body));
      if (body.status.code !== '0000') {
        deferred.resolve('Login fail');
        return deferred.promise;
      }
    }
    deferred.resolve(body);
  });
  return deferred.promise;
};


var conversationAction = function (value, sentence) {
  var deferred = Q.defer();
  var input = TEMP.cmConversation;

  input.header.sessionId = value.sessionId;
  input.body.msg = sentence;
  input.body.username = value.username;
  input.body.robotjid = value.robotjid;
  if(!NTEL_CM) {
    input.body.appid = 'ntelagent';   //ntelagent equals GCAS here
  } else {
    input.body.appid = 'maingui';
  }
  if (typeof value.questionid !== "undefined" && value.questionid !== null) {
    input.body.questionid = value.questionid;
  }
  logger.debug('conversation input===' + JSON.stringify(input));
  var options = {
    uri: config.CM_URL,
    method: 'POST',
    json: input
  };
  request(options, function (err, response, body) {
    if (err) {
      logger.debug('conversation request err=' + err);
    }
    logger.debug('conversation body=' + JSON.stringify(body));
    deferred.resolve('successful');
  });
  return deferred.promise;
};


var updateRobotId = function (id, value) {
  var deferred = Q.defer();
  logger.debug('update Robotid input=' + JSON.stringify(value));
  if (value == 'Login fail') {
    deferred.resolve('login fail')
  } else {
    var input = TEMP.cmListener;
    input.header.sessionId = value.body.result.sessionId;
    input.body.username = value.body.result.username;
    var options = {
      uri: config.CM_URL,
      method: 'POST',
      json: input
    };
    logger.debug('listener robotjid input' + JSON.stringify(input));
    request(options, function (err, response, body) {
      if (err) {
        logger.debug('update robotid request err=' + err)
      }
      logger.debug('listener body=' + JSON.stringify(body));
      input.body.robotjid = body.body.result.robotjid;
      var value = {
        'sessionId': input.header.sessionId,
        'username': input.body.username,
        'robotjid': body.body.result.robotjid,
        'polling': false,
        'listenerInput': input
      };
      cache.set(id, value, config.redis_expire);
      deferred.resolve(input);
    });
  }
  return deferred.promise;
};


var parsePollingResult = function (err, id, robot, data, cache_v, socket, room) {
  if ( _.isUndefined(data) || _.isEmpty(data)) {
    logger.debug('no message retreived from queue')
    return;
  }
  var output = xulUtils.processXur(data);
  if(_.isEmpty(output)) {
    var msg = data.body.result.msg;
    if (typeof msg !== 'undefined' && msg !== null) {
      var message = msg[0].info.xur.response.message;
      if (typeof message !== 'undefined' && message !== null) {
        var dialog = message['@value'];
        var questionid = message['@questionid'];
        var regex = /<br\s*[\/]?>/gi;
        dialog = dialog.replace(regex, "\n");
        logger.debug('retrieved dialog=' + dialog);
        cache_v.questionid = questionid;
        cache.set(id, cache_v, config.redis_expire);
        if (dialog.indexOf('Sorry your session has timed out') > -1) {
          cache.remove(id);
          poll.stopPoller(id);
        }
        if(queryHoundyNeed(dialog)) {
          var text = tempTable[id+'text'];
          logger.debug('houndy input' + text);
          queryHoundy(text, function(data) {
            if (typeof socket !== 'undefined' && socket !== null) {
              logger.debug('send response to client with ID: ' + id);
              socket.emit('response', {'userid':id, 'input':data});
              robot.messageRoom(room, data);
            } else {
              robot.messageRoom(room, data);
            }
          });
        } else {
          var cards = msg[0].info.xur.response.cards;
          var reply = null;
          if(checkNotNull(cards) && checkNotNull(cards.card)) {
            var html = cards.card['@value'];
            logger.debug('card html==' + html);
            $ = cheerio.load(html);
            reply = $('button').attr('onclick');
            logger.debug('card reply==' + reply);
          }
          if(checkNotNull(reply)) {
            dialog = dialog + '\n' + 'Reply Hint: ' + reply;
          }
          if (typeof socket !== 'undefined' && socket !== null) {
            socket.emit('response', {'userid':id, 'input':dialog});
            robot.messageRoom(room, dialog);
          } else {
            robot.messageRoom(room, dialog);
          }
        }
      }
    } else {
      logger.debug('no message retreived from queue');
    }
  } else {
    if (typeof socket !== 'undefined' && socket !== null) {
      logger.debug('send response to client with ID: ' + id);
      socket.emit('response', {'userid':id, 'input':output});
      robot.messageRoom(room, output);
    } else {
      robot.messageRoom(room, output);
    }
  }
}

var parsePollingResult1 = function (err, id, robot, data, cache_v, socket, room) {
  if (err) {
    var output = err.toString();
    if (typeof socket !== 'undefined' && socket !== null) {
      logger.debug('send response to client with ID: ' + id);
      socket.emit('response', {'userid':id, 'input':output});
      robot.messageRoom(room, output);
    } else {
      robot.messageRoom(room, output);
    }
  }

  var msg = data.body.result.msg;
  if (typeof msg !== 'undefined' && msg !== null) {
    var message = msg[0].info.xur.response.message;
    if (typeof message !== 'undefined' && message !== null) {
      var dialog = message['@value'];
      var questionid = message['@questionid'];
      var regex = /<br\s*[\/]?>/gi;
      dialog = dialog.replace(regex, "\n");
      logger.debug('retrieved dialog=' + dialog);
      cache_v.questionid = questionid;
      cache.set(id, cache_v, config.redis_expire);
      if (dialog.indexOf('Sorry your session has timed out') > -1) {
        cache.remove(id);
        poll.stopPoller(id);
      }
      if(queryHoundyNeed(dialog)) {
        var text = tempTable[id+'text'];
        logger.debug('houndy input' + text);
        queryHoundy(text, function(data) {
          if (typeof socket !== 'undefined' && socket !== null) {
            logger.debug('send response to client with ID: ' + id);
            socket.emit('response', {'userid':id, 'input':data});
            robot.messageRoom(room, data);
          } else {
            robot.messageRoom(room, data);
          }
        });
      } else {
        var cards = msg[0].info.xur.response.cards;
        var reply = null;
        if(checkNotNull(cards) && checkNotNull(cards.card)) {
          var html = cards.card['@value'];
          logger.debug('card html==' + html);
          $ = cheerio.load(html);
          reply = $('button').attr('onclick');
          logger.debug('card reply==' + reply);
        }
        if(checkNotNull(reply)) {
          dialog = dialog + '\n' + 'Reply Hint: ' + reply;
        }
        if (typeof socket !== 'undefined' && socket !== null) {
          socket.emit('response', {'userid':id, 'input':dialog});
          robot.messageRoom(room, dialog);
        } else {
          robot.messageRoom(room, dialog);
        }
      }
    }
  }
  else {
    logger.debug('no message retreived from queue')
  }
};

var processMessage = function (id, text, robot, socket, self, room) {

  var ep = new EventProxy();
  if (typeof room == 'undefined' || room == null) {
    room = 'GENERAL'
  }

  logger.debug('deliver message to room===' + room + 'with ID===' + id);
  var cur_question = id+'text';
  tempTable[cur_question] = text;

  ep.fail(function (err) {
    logger.error('Failed to retreive data from Redis server', err);
  });

  cache.get(id, function (err, value) {
    ep.emit('sessionFound', value);
  });

  ep.all('sessionFound', function (value) {
    logger.debug('cached session value=' + JSON.stringify(value));

    // this is only for DEV testing
    if(text === '--test') {
      //var data = fs.readFileSync(__dirname + '/../data_sample/askdialog.json', 'utf-8');
      var data1 = fs.readFileSync(__dirname + '/../data_sample/choosedialog.json', 'utf-8');
      //var output = xulUtils.processXur(JSON.parse(data));
      var output1 = xulUtils.processXur(JSON.parse(data1));
      console.log('choosedialog output=====' + output1);
      //robot.messageRoom(room, output);
      robot.messageRoom(room, output1);
      return;
    }

    if (text.indexOf('--switch to agent') > -1 ) {   // --switch to agent pots or  --switch to agent broadband command
      if (text.indexOf('--switch to agent pots') > -1 && !NTEL_CM) {
        NTEL_CM = true;
      } else if (text.indexOf('--switch to agent broadband') > -1 && NTEL_CM) {
        NTEL_CM = false;
      } else {
        //do nothing keep same CM
      }

      if (checkNotNull(value)) {
        if (value.polling) {
          logger.debug('stop polling============');
          poll.stopPoller(id);
        }
        cache.remove(id);
      }

      var switchMsg = null;
      if(NTEL_CM) {
        switchMsg = 'Switched to Ntelagent flow';
      } else {
        switchMsg = 'Switched to GCAS flow';
      }
      if (self) {
        robot.messageRoom(room, switchMsg);
      }
      else {
        socket.emit('response', {'userid': id, 'input': switchMsg});
      }

      loginAction(id, robot)
        .then(function (result) {
          return updateRobotId(id, result);
        }).
      then(function () {
        cache.get(id, function (err, value) {
          logger.debug(id + ' start polling the messages' + JSON.stringify(value));
          if (!value.polling) {
            poll.pollAll(id, robot, socket, room, config.pollInterval, parsePollingResult);
          }
          var question = id + ': ' + text + '\n';
          if (!self) {
            robot.messageRoom(room, question);
          }
        });
      });
      return;
    }

    if (text === 'quit') {
      if (checkNotNull(value)) {
        if (value.polling) {
          logger.debug('stop polling============');
          poll.stopPoller(id);
        }
        cache.remove(id);
      }
      if (self) {
        robot.messageRoom(room, 'Session is terminated');
      }
      else {
        socket.emit('response', {'userid': id, 'input': 'Session is terminated'});
      }
    } else if (checkNotNull(value)) {
      conversationAction(value, text)
        .then(function (result) {
          logger.debug('conversation result=' + result);
          logger.debug('poller exit' + tempTable[id]);
          logger.debug('conversation polling=' + value.polling);
          if (!value.polling || !checkNotNull(tempTable[id])) {
            poll.pollAll(id, robot, socket, room, config.pollInterval, parsePollingResult);
          }
          if (!self) {
            var question = id + ': ' + text + '\n';
            robot.messageRoom(room, question);
          }
        });
    }
    else {
      loginAction(id, robot)
        .then(function (result) {
          if( result === 'Login fail') {
            return;
          }
          return updateRobotId(id, result);
        }).
      then(function () {
        cache.get(id, function (err, value) {
          logger.debug(id + ' start polling the messages' + JSON.stringify(value));
          if(_.isUndefined(value)) {
            if (self) {
              robot.messageRoom(room, 'Login fail');
            } else {
              socket.emit('response', {'userid': id, 'input': 'Login fail'});
            }
            return;
          }
          if (!value.polling) {
            poll.pollAll(id, robot, socket, room, config.pollInterval, parsePollingResult);
          }
          var question = id + ': ' + text + '\n';
          if (!self) {
            robot.messageRoom(room, question);
          }
        });
      });
    }
  });
}

var checkNotNull = function (obj) {
  if(typeof obj !== 'undefined' && obj !== null) {
    return true;
  } else {
    return false;
  }
};

var queryHoundyNeed = function(cm) {
  cm = cm.trim();
  logger.debug('cm result======' + cm + '====');
  if (cm == 'I don\'t understand.' || cm == 'no response returned' || cm == 'I don\'t know.' || cm == 'I don\'t expect "Yes".') {
    return true;
  }
  return false;
};

var queryHoundy = function(sentence, callback) {
  var header = houndy.generateAuthHeaders(config.houndy_clientid, config.houndy_clientkey);
  //header['Hound-Request-Info'] = config.Hound_Request_Info;
  logger.debug('houndy headers===' + JSON.stringify(header));
  var options = {
    url: config.houndy_url + sentence,
    headers: header
  };

  logger.debug('houndy header==' + JSON.stringify(header));
  request(options, function(err, res, body){
    if(err) {
      logger.debug('houndy err out====' + err);
      callback(err.toString());
    } else if(res.statusCode !== 200) {
      callback('invalid input');
    } else {
      logger.debug('houndy body====' + body);
      if(body.indexOf('Authentication failed') > -1) {
        callback(body);
        return;
      }
      try {
        var result = JSON.parse(body);
        if(checkNotNull(result.AllResults[0])){
          if(checkNotNull(result.AllResults[0].WrittenResponseLong)) {
            callback(result.AllResults[0].WrittenResponseLong)
          }
        }
      } catch (ex) {
        callback(ex.toString());
      }
    }
  });
};

process.stdin.resume();//so the program will not close instantly

var exitHandler = function(options, err) {
  if (options.cleanup) {
    console.log('clean');
  }
  if (err) {
    console.log(err.stack);
  }
  if (options.exit) {
    process.exit();
  }
};

//do something when app is closing
process.on('exit', exitHandler.bind(null,{cleanup:true}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit:true}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));


exports.processMessage = processMessage;

//exports.callback = parsePollingResult;





