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
var robotManager = require('./robotManager');
var engageAction = require('./engageAction');
var msg = require('./message');
var uuid = require('node-uuid');

// only when engagement setup, allow agent to set engagement mode
var check3Way = function (prop, text, value) {
    if (value && prop && prop.msg_dest) {
        if (text === '@@toall' || prop.msg_dest === 'TOALL') {
            value.TO = 'ALL';
            cache.set('ss' + value.sessionId, value, config.redis_expire);
            return true;
        } else if (text === '@@toagent' || prop.msg_dest === 'TOCM') {
            value.TO = 'AGENT';
            cache.set('ss' + value.sessionId, value, config.redis_expire);
            return true;
        } else if (text == '@@tocustomer' || prop.msg_dest == 'TOCUST') {
            value.TO = 'CUSTOMER';
            cache.set('ss' + value.sessionId, value, config.redis_expire);
            return true;
        }
    }
    return false;
};
exports.check3Way = check3Way;

var sendMsgToAppQ = function (id, value, type, appId, prop, sentence) {
    var str_prop = JSON.stringify(prop);
    var input = '';
    if (value.channelType === 'ivr') {
        var audio_url = (prop && prop.audio) ? prop.audio : '';
        var code = (prop && prop.status) ? prop.status : '';
        var desc = (prop && prop.statusText) ? prop.statusText : '';
        input = util.format(TEMP.conversationIvrReq, value.sessionId, value.realId, value.channelType, appId, str_prop, id, sentence, audio_url, code, desc);
    } else {
        if (type === 'SHADOW') {
            input = util.format(TEMP.conversationReq, value.sessionId, value.agentId, value.channelType, appId, str_prop, id, sentence);
        } else {
            input = util.format(TEMP.conversationReq, value.sessionId, value.realId, value.channelType, appId, str_prop, id, sentence);
        }
    }

    logger.debug('Prolog CM conversation input===' + input);
    msg.sendMessage('', '', '', input, 'cm');
};

exports.sendMsgToAppQ = sendMsgToAppQ;

var loginAppQ = function (id, room, app, appId, message, prop) {
    var prologLogin = TEMP.loginReq;
    var custType = 'customer';
    if (prop && prop.cust_type === 'AGENT') {
        custType = 'agent';
    }

    if (_.isEmpty(message.sessionid)) {
        var sessionid = uuid.v1();
        prologLogin = util.format(prologLogin, id, sessionid+'_'+appId, appId, app, room, config.APPCM, custType);
    } else {
        prologLogin = util.format(prologLogin, id, message.sessionid+'_'+appId, appId, app, room, config.APPCM, custType);
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
            cache.remove('ss' + sessionId);
            cache.remove(customerId+value.application);
            if (value.engagement) {
                var shadowCustomerId = value.shadowCustId;
                cache.remove(shadowCustomerId+value.application);
                var shadowRobot = robotManager.getRobot(shadowCustomerId);
                if (shadowRobot) {
                    engageAction.logoutShadowUser(shadowRobot, function (err, body) {
                        logger.debug('Logout shadow user response from quit action=' + JSON.stringify(body));
                    });
                }
                robotManager.delRobot(shadowCustomerId);
            }
        }
        var quit_msg = "";
        if (app === 'MM') {
            quit_msg = 'Session is terminated';
        }
        if (_.isEmpty(room)) {
            return true;
        }
        if (!_.isEmpty(value)) {
            msg.sendMessage(robot, room, value.realId, { message: quit_msg, sessionid: value.sessionId }, app);
        } else {
            msg.sendMessage(robot, room, room, { message: quit_msg }, app);
        }
        return true;
    }
    return false;
};

exports.cleanCache = cleanCache;

var appToAgent = function (id, sentence, prop, value, type, robot) {
    if (type === 'REAL') {
        var new_prop = _.merge(prop, { msg_to: 'TOAGENT' });
        msg.sendMessage(robot, value.appAndShadowChannelId, value.realId, { message: '@@CUS@@' + sentence, props: new_prop }, 'MM');
    }
    sendMsgToAppQ(id, value, type, value.application, prop, sentence);
};
exports.appToAgent = appToAgent;


var appToAll = function (id, sentence, prop, value, type, robot) {
    var new_prop = _.merge(prop, { msg_to: 'TOALL' });
    if (type === 'REAL') {
        msg.sendMessage(robot, value.appAndShadowChannelId, value.realId, { message: '@@CUS@@' + sentence, props: new_prop }, 'MM');
    }
    sendMsgToAppQ(id, value, type, value.application, prop, sentence);
};
exports.appToAll = appToAll;