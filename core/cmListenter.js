/**
 * Created by min on 7/19/16.
 */

var CMPub = require('../common/redisSub').CMPub;
var CMSub = require('../common/redisSub').CMSub;
var config = require('../config');
var logger = require('../common/logger');
var CMMsg = require('./cmMessenger');

var loopRedisCMQ = function () {
    CMSub.blpop(config.APPCM, 0, function (err, message) {
        if (err) {
            logger.error('redis q err' + err);
        }
        logger.debug('received cm message=' + message[1]);
        try {
            CMMsg.process(message[1]);
        } catch (err) {
            logger.error('redis process err' + err);
        }
        process.nextTick(loopRedisCMQ);
    });
};

var init = function () {
    loopRedisCMQ ();
};

exports.init = init;