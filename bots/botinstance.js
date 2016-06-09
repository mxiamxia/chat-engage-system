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

var initHubot = function (id, password, type, cb) {
    //robot = Hubot.loadBot undefined, Options.adapter, Options.enableHttpd, Options.name, Options.alias
    var robot = hubot.loadBot(undefined, "matteruser", false, "", false);
    robot.adapter.once('connected', function () {
        loadScripts(robot);
        cb(null, robot);
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
            robot.adapter.profle = {'id': id, 'type': type};
            storeRobot(userId, robot, type);
        }
    });
};

//type value could be "APP" or "CUSTOMER"
var storeRobot = function (id, robot, type) {
    robotManager.setRobot(id, robot, type);
};

module.exports = initHubot;
