/**
 * Created by min on 6/7/16.
 */

// init hubot main automation robot
require('coffee-script/register');
var hubot = require('hubot');
var path  = require('path');
var fs    = require('fs');
var logger = require('../common/logger');
var robotManager = require('../core/robotManager');
var EventProxy = require('eventproxy');

var initHubot = function (id, password, type, cb) {
    var ep = new EventProxy();
    //robot = Hubot.loadBot undefined, Options.adapter, Options.enableHttpd, Options.name, Options.alias
    var robot = hubot.loadBot(undefined, "matteruser", false, "", false);
    robot.adapter.once('connected', function () {
        loadScripts(robot);
        ep.emit('doneConnect', 'done');
        logger.debug('The APP hubot login token=' + robot.adapter.client.token);
        robotManager.setToken(robot.adapter.client.token);
    });
    robot.adapter.mmUser = id;
    robot.adapter.mmPassword = password;
    robot.run();

    var loadScripts = function (robot) {
        var scriptsPath = path.resolve(".", "scripts");
        console.log('script path=' + scriptsPath );
        robot.load(scriptsPath);
    };

    robot.adapter.once('userProfile', function (user) {
        logger.debug('The current profile= ' + JSON.stringify(user));
        if (user && user.id) {
            var userId = user.id;
            robot.adapter.profile = {'id': userId, 'type': type};
            storeRobot(userId, robot, type);
        }
        ep.emit('doneProfile', 'done');
    });

    robot.adapter.once('userChannel', function() {
        logger.debug('The current profile channel is ready');
        ep.emit('doneChannel', 'done');
        //dispatcher.emit('refreshChannel', 'done');
    });

    ep.fail(function (err) {
        logger.error('Failed to init hubot instance', err);
    });

    ep.all('doneConnect', 'doneProfile', 'doneChannel', function() {
        logger.debug('The new Hubot instance is ready');
        cb(null, robot);
    });
};

//type value could be "APP" or "CUSTOMER"
var storeRobot = function (id, robot, type) {
    if(type === 'APP') {
        robotManager.setRobot('APP', robot);
    }
};

module.exports = initHubot;
