/**
 * Created by min on 7/8/16.
 */


var Sub = require('../common/redisSub').Sub;
var Pub = require('../common/redisSub').Pub;
var cache = require('../common/cache');
var robotManager = require('../core/robotManager');
var CM = require('../core/prologCm');
var logger = require('../common/logger');
var _ = require('lodash');
var config = require('../config');

var msg_template = {
    app: "IVR",
    channel_id: "ejS6b2eY@cyberobject.com",
    create_at: Date.now(),
    filenames: [],
    message: "ready to close a job",
    props: {
        msg_type: "conversation"
    },
    sessionid: "ejS6b2eY@cyberobject.com",
    user_id: "ejS6b2eY@cyberobject.com"
};

var sendMessage = function (robot, socket, room, id, message, isHubot) {
    if (isHubot) {
        robot.messageRoom(room, message);
    } else {
        var msg = _.clone(msg_template);
        msg.channel_id = id;
        msg.user_id = id;
        msg.message = message.message;
        if (message.prop) {
            msg.props = _.merge(msg.props, message.prop);
            // msg.props = message.prop;
        }
        msg.sessionid = message.sessionid;
        logger.debug('send message to redis client=' + JSON.stringify(msg));
        Pub.rpush(config.IVRCHANNEL, JSON.stringify(msg));
    }
};

var loopRedisQ = function () {
    Sub.blpop(config.IVRAPP, 0, function (err, message) {
        if (err) {
            logger.error('redis q err' + err);
        }
        logger.debug('received message=' + message[1]);
        try {
            message = JSON.parse(message[1]);
            var robot = robotManager.getRobot('APP');
            var id = message.user_id;
            CM.processPrologMessage(id, message, robot, null, false, 'ivr', id);
        } catch (err) {
            logger.error('redis process err' + err);
        }
        process.nextTick(loopRedisQ);
    });
};

loopRedisQ();

exports.sendMessage = sendMessage;