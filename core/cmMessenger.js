/**
 * Created by min on 7/19/16.
 */


var robotManager = require('../core/robotManager');
var _ = require('lodash');
var logger = require('../common/logger');
var xml2js = require('xml2js');
var parser = new xml2js.Parser();
var cache = require('../common/cache');
var msg = require('./message');
var sessionDao = require('../dao/').Session;
var config = require('../config');

var process = function (message) {
    if (_.isEmpty(message)) {
        return;
    }
    parser.parseString(message, function (err, result) {
        try {
            var action = result.response.header[0].action[0].$.value;
            switch (action) {
                case 'login':
                    loginProcess(message, result);
                    break;
                case 'conversation':
                    conversationProcess(message, result);
                    break;
                case '':
                    break;
                default:
                    //
            }
        } catch (err) {
        }
    });
};

exports.process = process;

var loginProcess = function (message, result) {
    var sessionid = result.response.header[0].sessionid[0].$.value;
    var id        = result.response.header[0].userid[0].$.value;
    var app = result.response.header[0].app[0].$.value;
    var channel = result.response.header[0].channel[0].$.value;

    logger.debug('Prolog CM login output=' + JSON.stringify(result));
    var robot = robotManager.getRobot('APP');
    var session = sessionid;
    var customCache = {sessionId: session, type: 'REAL'};
    var sessionInfo = {
        'sessionId': session,
        'realId': id,
        'realChannelId': channel,
        'appId': robot.adapter.profile.id,
        'channelType': app
    };
    sessionDao.newAndSave(session, robot.adapter.profile.id, id, app, function(err, session) {
        logger.debug('Create new session info into mongo db=' + JSON.stringify(session));
    });
    cache.set(id, customCache, config.redis_expire);
    cache.set(session, sessionInfo, config.redis_expire);
    var new_prop = {msg_type: 'login'};
    msg.sendMessage(robot, channel, id, {message: message, prop: new_prop, sessionid: session}, app);
    //TODO: send original text to app
};

var conversationProcess = function (message, result) {
    var sessionid = result.response.header[0].sessionid[0].$.value;
    var id        = result.response.header[0].userid[0].$.value;
    cache.pget(sessionid)
        .then(function (value) {
            if (_.isEmpty(value)) {
                //TODO: if cache data is empty
            }
            
        })
        .catch(function (err) {

        })

}