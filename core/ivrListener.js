/**
 * Created by min on 7/19/16.
 */
/**
 * Created by min on 7/19/16.
 */

var Sub = require('../common/redisSub').Sub;
var config = require('../config');
var logger = require('../common/logger');
var CM = require('./prologCm');
var robotManager = require('./robotManager');

var loopRedisIVRQ = function () {
    Sub.blpop(config.APPIVR, 0, function (err, message) {
        if (err) {
            logger.error('redis q err' + err);
        }
        logger.debug('received message=' + message[1]);
        try {
            message = JSON.parse(message[1]);
            var appId = message.appId;
            var robot = robotManager.getRobot('APP_' + appId);
            var id = message.user_id;
            var app = message.app.toLowerCase();
            message.props.sessionid = message.sessionid;
            CM.processPrologMessage(id, message, robot, app, id);
        } catch (err) {
            logger.error('redis process err' + err);
        }
        process.nextTick(loopRedisIVRQ);
    });
};

var init = function () {
    loopRedisIVRQ();
};

exports.init = init;
