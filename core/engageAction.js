/**
 * Created by min on 5/26/16.
 */

var xml2js = require('xml2js');
var template = require('../common/template');
var util = require('util');
var request = require('request');
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

var appIdList = ['wgwwqx5ei789fngx86osp6bzmo'];

var transferStart = function (input) {
  if (!_.isEmpty(input)) {
    parser.parseString(input, function (err, result) {
      if (err) {
        //TODO: err
      }
      if (result && result.message && result.message.header && result.message.header[0].action) {
        var action = result.message.header[0].action[0].$.value;
        if (action === 'transfer_start') {
          var sessionid = result.message.header[0].sessionid[0].$.value;
          var userid = result.message.header[0].userid[0].$.value;
          console.log('Engagement request user id=' + userid);
          cache.getSessionById(userid, function(err, sessionData) {
            if (sessionData.sessionId !== sessionid) {
              logger.debug('Engagement failed, session id from request does not match customer session id');
              return;
            }
            getAvailableAgent(function (err, agentId) {
              var shadowName = 'shadow_customer_' + Date.now().toString(16);
              var shadowEmail = shadowName+'@cyberobject.com';
              createShadowUser(shadowEmail, '123456', shadowName, function (err, response) {
                logger.debug('Create shadow user = ' + JSON.stringify(response));
                if (response.username === shadowName) {
                  initHubot(shadowEmail, '123456', 'CUSTOMER', function (err, robot) {
                    var appId = sessionData.appId;
                    logger.debug('Engagement Channel Info=' + JSON.stringify(robot.adapter.client.channel_details));
                    //TODO: make here parallel processing
                    getChannelIdById(agentId, robot, function(err, agentChannelId) {
                      getChannelIdById(appId, robot, function(err, appChannelId) {
                        processEngagement(userid, agentChannelId, agentId, sessionid);
                        var customerShadowCache = {'sessionId': sessionid, 'agentChannelId': agentChannelId, 'appChannelId': appChannelId, 'type': 'SHADOW'};
                        customerShadowCache[agentId] = 'AGENT';
                        customerShadowCache[appId] = 'APP';
                        cache.set(robot.adapter.profile.id, customerShadowCache, config.redis_expire);
                        sessionData.agentId = agentId;
                        //sessionData.agentChannelId = channelId;
                        sessionData.TO = 'ALL';
                        sessionData.shadowCustId = robot.adapter.profile.id;
                        sessionData.appAndShadowChannelId = appChannelId;
                        sessionData.engagement = true;
                        cache.set(sessionid, sessionData, config.redis_expire);
                        logger.debug('Agent Channel ID=' + agentChannelId);
                        sendEngagementMessages(sessionData, agentChannelId, robot);
                        //notify app get shadowCustomChannel ID
                        //dispatcher.emit(userid, sessionData);
                      });
                    });
                  });
                } else {
                  //TODO: if create shadow user failed
                  return;
                }
              });
            });
          });
        }
      }
    });
  }
}

var createShadowUser = function (email, password, name, cb) {
  mattermostApi.createUser(email, password, name, cb);
}

var sendEngagementMessages = function (sessionData, channelId, robot) {
  var q = consts.QUESTION;
  var a = consts.ANSWER;

  if(!_.isEmpty(sessionData[q])) {
    var question = sessionData[q];
    robot.messageRoom(channelId, question);
  }
  if(!_.isEmpty(sessionData[a])) {
    var answer = sessionData[a];
    robot.messageRoom(channelId, answer);
  }
};

var getAvailableAgent = function (callback) {
  //TODO: get available online agents from Mattermost

  getAgentList(robotManager.getRobot(), function(err, result) {
    logger.debug('Available Engagement Agent List=' + result);
    result = JSON.parse(result);
    var members = result.members;
    if(members.length > 0) {
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

var processEngagement = function (userid, channelId, agentid, sessionid) {
  var req = util.format(template.transferAcceptReq, sessionid, agentid);
  var options = {
    uri: config.CM_PROLOG,
    method: 'POST',
    qs: {request: req},
    headers: {'Content-Type': 'application/xml'}
  };
  request(options, function (err, response, body) {
    logger.debug("");
    if (err || response.statusCode !== 200) {

    }
  });
}

var getRandomInt = function(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

var getMember = function (data) {
  var radomIdx = getRandomInt(0, data.length);
  var member = data[radomIdx];

  if(member && appIdList.indexOf(member.id) === -1) {
    return member.id;
  }
  return getMember(data);
}

var getAgentList = function(robot, cb) {
  var token = robot.adapter.client.token;
  var teamId = robot.adapter.client.teamID;
  mattermostApi.getEngagementAgentList(teamId, token, cb);
}

var getChannelIdById = function (id, robot, cb) {
  var found = false;
  var data = robot.adapter.client.channel_details;
  for (var i=0; i<data.length; i++) {
    var channel = data[i];
    if(channel && channel.type === 'D') {
      if(channel.name.indexOf('__') > -1) {
        var pair = channel.name.split('__');
        if(id === pair[0]) {
          found = true;
          cb(null, channel.id);
        }
      }
    }
  }
  if(!found && robot.adapter.client.token) {
    var token = robot.adapter.client.token;
    var teamId = robot.adapter.client.teamID;
    mattermostApi.createChannelId(id, token, teamId, function(err, response) {
      logger.debug('Create shadow user channel Id= ' + JSON.stringify(response));
      if(response.id) {
        cb(null, response.id);
      } else {
        cb(new Error('Create new channel Id failed'));
      }
    });
  }
};

exports.transferStart = transferStart;
exports.getChannelIdById = getChannelIdById;
