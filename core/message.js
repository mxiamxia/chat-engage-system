/**
 * Created by min on 7/8/16.
 */


var Pub = require('../common/redisSub').Pub;
var CMPub = require('../common/redisSub').CMPub;
var cache = require('../common/cache');
var robotManager = require('../core/robotManager');
var logger = require('../common/logger');
var _ = require('lodash');
var config = require('../config');
var TEMP = require('../common/template');
var util = require('util');

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

var sendMessage = function(robot, room, id, message, app) {
    switch (app) {
        case 'MM':
            logger.debug('send ivr message to agent1=' + JSON.stringify(message));
            var prop = message.props;
            if (prop && prop.audio && prop.audio !== '$audio' && message.message.indexOf('@@CUS@@') === 0) {
                var text = message.message;
                text = text.substring('@@CUS@@'.length);
                var url = prop.audio;
                var sessionid = message.sessionid || prop.sessionid;
                var audioCard = util.format(TEMP.audioCard, sessionid, id, id, sessionid, url, text);
                message.message = '@@CUS@@' + audioCard;
                logger.debug('send ivr message to agent=' + JSON.stringify(message));
                robot.messageRoom(room, message);
            } else {
                robot.messageRoom(room, message);
            }
            break;
        case 'ivr':
            var msg = _.clone(msg_template);
            msg.channel_id = id;
            msg.user_id = id;
            msg.message = message.message;
            msg.create_at = Date.now();
            if (!_.isEmpty(message.prop)) {
                msg.props = _.merge(msg.props, message.prop);
            } else {
                msg.props = {};
            }
            msg.sessionid = message.sessionid;
            logger.debug('send message to IVR=' + JSON.stringify(msg));
            Pub.rpush(config.IVRCHANNEL, JSON.stringify(msg));
            break;
        case 'cm':
            CMPub.rpush(config.WORKFLOW, message);
            logger.debug('send message to CM=' + message);
            break;
    }
};

exports.sendMessage = sendMessage;