var request = require('request');
var config = require('../config');
var cache = require('./cache');
var logger = require('./logger');
var template = require('./template');
var EventProxy   = require('eventproxy');
var intervalid = require('./intervalTbl');

var pollAll = function(id, robot, socket, room, interval, callback) {
  var ep = new EventProxy();
  cache.get(id, function(err, value) {
    ep.emit('ready', value);
  });

  ep.all('ready', function(value) {
    logger.debug('pollAll cached value=' + JSON.stringify(value));
    var pollerId = setInterval(function(){pollerFunc(robot, id, value, socket, room, callback)}, interval);
    if(checkNotNull(intervalid[id])) {
      stopPoller(intervalid[id]);
    }
    intervalid[id] = pollerId;
    value.polling = true;
    cache.set(id, value, config.redis_expire);
  });

}

var pollerFunc = function(robot, id, value, socket, room, callback) {
  var options = {
    uri: config.CM_URL,
    method: 'POST',
    json: value.listenerInput
  };
  logger.debug('listener input=' + JSON.stringify(value.listenerInput));
  request(options, function(err, response, body) {
    if(err) {
      callback(err, id, robot, body, value, socket, room);
    } else if(response.statusCode !== 200) {
      err = new Error('http returned error code: ' +  response.statusCode)
      callback(err, id, robot, body, value, socket, room);
    } else {
      logger.debug('listener output=' + JSON.stringify(body));
      callback(null, id, robot, body, value, socket, room);
    }
  });
}

//var parsePollResult = function(robot, res, response, id, value) {
//  var msg = response.body.result.msg;
//  if (typeof msg !== "undefined" && msg !== null) {
//    var message = response.body.result.msg[0].info.xur.response.message
//    if(typeof message !== "undefined" && message !== null) {
//      var dialog = message['@value'];
//      var questionid = message['@questionid'];
//      var regex = /<br\s*[\/]?>/gi;
//      dialog = dialog.replace(regex, "\n")
//      logger.debug('retrieved dialog=' + dialog);
//      value.questionid = questionid;
//      cache.set(id, value);
//      robot.messageRoom('GENERAL', dialog);
//      res.send(dialog);
//    }
//  }
//}

var stopPoller = function(id) {
  var pollerId = intervalid[id]
  if(pollerId) {
    clearInterval(pollerId);
  }
}

var checkNotNull = function (obj) {
  if(typeof obj !== 'undefined' && obj !== null) {
    return true;
  } else {
    return false;
  }
}

exports.pollAll = pollAll;
exports.stopPoller = stopPoller;
