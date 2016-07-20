/**
 * Created by min on 6/10/16.
 */

var Q = require('q');
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
var parser = new xml2js.Parser();
var CMPub = require('../common/redisSub').CMPub;
var CMSub = require('../common/redisSub').CMSub;

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

var sendMsgToAppQ = function (value, type, prop, sentence) {
    var str_prop = JSON.stringify(prop);
    if (type === 'SHADOW') {
        var input = util.format(TEMP.conversationReq, value.sessionId, value.agentId, value.channelType, str_prop, sentence);
    } else {
        var input = util.format(TEMP.conversationReq, value.sessionId, value.realId, value.channelType, str_prop, sentence);
    }
    logger.debug('Prolog CM conversation input===' + input);
    CMPub.rpush(config.WORKFLOW, input);
};

exports.sendMsgToAppQ = sendMsgToAppQ;

var loginAppQ = function (id, app, message) {
    var prologLogin = TEMP.loginReq;
    if (app.toLowerCase() === 'ivr') {
        prologLogin = util.format(prologLogin, id, message.sessionid, app);
    } else {
        prologLogin = util.format(prologLogin, id, '', app);
    }
    logger.debug('login input=' + prologLogin);
    CMPub.rpush(config.WORKFLOW, prologLogin);
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
    }
    return false;
};

exports.cleanCache = cleanCache;

var appToAgent = function (sentence, prop, value, type, robot) {
    if (type === 'REAL') {
        var new_prop = _.merge(prop, {msg_to: 'TOAGENT'});
        msg.sendMessage(robot, value.appAndShadowChannelId, value.realId, {message: '@@CUS@@' + sentence, prop: new_prop}, 'MM');
    }
    sendMsgToAppQ(value, type, prop, sentence);
};
exports.appToAgent = appToAgent;


var appToAll = function (sentence, prop, value, type, robot) {
    var new_prop = _.merge(prop, {msg_to: 'TOALL'});
    if (type === 'REAL') {
        msg.sendMessage(robot, value.appAndShadowChannelId, value.realId, {message: '@@CUS@@' + sentence, prop: new_prop}, 'MM');
    }
    sendMsgToAppQ(value, type, prop, sentence);
};
exports.appToAll = appToAll;
