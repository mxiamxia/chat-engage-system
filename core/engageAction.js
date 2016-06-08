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
          console.log('engage cache userid==' + userid);
          cache.get(userid, function (err, data) {
            console.log('engage cache==' + JSON.stringify(data));
            getAvailableAgent(data.channels, function (err, channelId, agentid) {
              if (err) {
                return;
              }
              processEngagement(userid, channelId, agentid, sessionid);
            });
          });
        }
      }
    });
  }
}

var getAvailableAgent = function (data, callback) {
  //TODO: get available online agents from Mattermost
  var channel = getChannel(data);
  logger.debug( 'channel=' + JSON.stringify (channel));
  var channelId = '';
  var agentId = '';
  if (config.ENGAGE_MODE = 'TEST') {
    channelId = '7j9h95k68idu8xezh9ybamiisc';
    agentId = 'dmg5m3mwytgyfpy8hscp4i7h3c';
  } else {
    if(channel.name.indexOf('__') > -1) {
      var pair = channel.name.split('__');
      agentId = pair[0];
    }
    channelId = channel.channelId;
  }
  callback(null, channelId, agentId);
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
    var engagementData = {'userid': userid, 'agentid': agentid, 'channelId': channelId, 'sessionid': sessionid};
    dispatcher.emit(userid, engagementData);
  });

}

var getRandomInt = function(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

var getChannel = function (data) {
  var radomIdx = getRandomInt(0, data.length);
  var channel = data[radomIdx];

  if(channel && channel.type === 'D') {
    return {'channelId': data.id, 'name': data.name};
  }
  return getChannel(data);
}


exports.transferStart = transferStart;
