/**
 * Created by min on 6/10/16.
 */

var logger = require('../common/logger');
var request = require('request');
var config = require('../config');
var util = require('util');
var _ = require('lodash');
var cache = require('../common/cache');
var consts = require('../common/consts');
var TEMP = require('../common/template');
var xml2js = require('xml2js');
var robotManager = require('./robotManager');
var engageAction = require('./engageAction');
var msg = require('./message');

// only when engagement setup, allow agent to set engagement mode
var check3Way = function (prop, text, value) {
    if (value && prop && prop.msg_dest) {
        if (text === '@@toall' || prop.msg_dest === 'TOALL') {
            value.TO = 'ALL';
            cache.set(value.sessionId, value, config.redis_expire);
            return true;
        } else if (text === '@@toagent' || prop.msg_dest === 'TOCM') {
            value.TO = 'AGENT';
            cache.set(value.sessionId, value, config.redis_expire);
            return true;
        } else if (text == '@@tocustomer' || prop.msg_dest == 'TOCUST') {
            value.TO = 'CUSTOMER';
            cache.set(value.sessionId, value, config.redis_expire);
            return true;
        }
    }
    return false;
};
exports.check3Way = check3Way;

var sendMsgToAppQ = function (id, value, type, prop, sentence) {
    var str_prop = JSON.stringify(prop);
    if (type === 'SHADOW') {
        var input = util.format(TEMP.conversationReq, value.sessionId, value.agentId, value.channelType, str_prop, id, sentence);
    } else {
        var input = util.format(TEMP.conversationReq, value.sessionId, value.realId, value.channelType, str_prop, id, sentence);
    }
    logger.debug('Prolog CM conversation input===' + input);
    msg.sendMessage('', '', '', input, 'cm');
};

exports.sendMsgToAppQ = sendMsgToAppQ;

var loginAppQ = function (id, room, app, message) {
    var prologLogin = TEMP.loginReq;
    if (_.isEmpty(message.sessionid)) {
        prologLogin = util.format(prologLogin, id, '', app, room);
    } else {
        prologLogin = util.format(prologLogin, id, message.sessionid, app, room);
    }
    logger.debug('login input=' + prologLogin);
    msg.sendMessage('', '', '', prologLogin, 'cm');
};
exports.loginAppQ = loginAppQ;

var cleanCache = function (room, text, value, robot, app) {
    if (text.toLowerCase() === 'quit') {
        if (!_.isEmpty(value)) {
            var sessionId = value.sessionId;
            var customerId = value.realId;
            cache.remove(sessionId);
            cache.remove(customerId);
            if (value.engagement) {
                var shadowCustomerId = value.shadowCustId;
                cache.remove(shadowCustomerId);
                var shadowRobot = robotManager.getRobot(shadowCustomerId);
                if (shadowRobot) {
                    engageAction.logoutShadowUser(shadowRobot, function (err, body) {
                        logger.debug('Logout shadow user response from quit action=' + JSON.stringify(body));
                    });
                }
                robotManager.delRobot(shadowCustomerId);
            }
        }

        if(!_.isEmpty(value)) {
            msg.sendMessage(robot, room, value.realId, {message: 'Session is terminated', sessionid: value.sessionId}, app);
        } else {
            msg.sendMessage(robot, room, room, {message: 'Session is terminated'}, app);
        }
        return true;
    }
    return false;
};

exports.cleanCache = cleanCache;

var appToAgent = function (id, sentence, prop, value, type, robot) {
    if (type === 'REAL') {
        var new_prop = _.merge(prop, {msg_to: 'TOAGENT'});
        msg.sendMessage(robot, value.appAndShadowChannelId, value.realId, {message: '@@CUS@@' + sentence, prop: new_prop}, 'MM');
    }
    sendMsgToAppQ(id, value, type, prop, sentence);
};
exports.appToAgent = appToAgent;


var appToAll = function (id, sentence, prop, value, type, robot) {
    var new_prop = _.merge(prop, {msg_to: 'TOALL'});
    if (type === 'REAL') {
        msg.sendMessage(robot, value.appAndShadowChannelId, value.realId, {message: '@@CUS@@' + sentence, prop: new_prop}, 'MM');
    }
    sendMsgToAppQ(id, value, type, prop, sentence);
};
exports.appToAll = appToAll;
