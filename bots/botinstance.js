/**
 * Created by min on 6/7/16.
 */

// init hubot main automation robot
require('coffee-script/register');
var hubot = require('hubot');
var path  = require('path');
var fs    = require('fs');

var initHubot = function (id, password) {
    //robot = Hubot.loadBot undefined, Options.adapter, Options.enableHttpd, Options.name, Options.alias
    var robot = hubot.loadBot(undefined, "matteruser", false, "", false);
    robot.adapter.once('connected', function(){loadScripts(robot)});
    robot.adapter.mmUser = id;
    robot.adapter.mmPassword = password;
    robot.run();

    var loadScripts = function (robot) {
        var scriptsPath = path.resolve(".", "scripts");
        console.log('script path=' + scriptsPath );
        robot.load(scriptsPath);
    };
};

module.exports = initHubot;
