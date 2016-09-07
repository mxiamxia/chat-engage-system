/**
 * Created by min on 7/19/16.
 */

var cmListener = require('./cmListenter');
var ivrListenr = require('./ivrListener');
var Promise = require('bluebird');
var mattermostApi = require('../api/mattermostApi');
var logger = require('../common/logger');
var bot = require('../bots/botInstance');
var async = require('async');
var config = require('../config');

var applist = ['ntelagent', 'maingui', 'icas'];

var init = function() {
    //init robot instance
    mattermostApi.getAppUsers()
        .then(function (value) {
            logger.debug('Current APP Robots=' + value);
            var fnArray = [];
            value = JSON.parse(value);
            var orgs = value.body.orgs;
            if (orgs.length > 0) {
                var apps= orgs[0].apps;
                if (apps.length > 0) {
                    for (var i=0; i<apps.length; i++) {
                        (function (idx) {
                            var app = apps[idx].userName;
                            config.APPLIST.push(apps[idx].userId);
                            fnArray.push(function(cb){bot.initHubot(app, '123456', 'APP', applist[idx], cb)});
                        })(i);
                    }
                }
            }

            async.series(fnArray, function (robots) {
                logger.debug('init robots numbers=' + robots.length)
            });


            // var initBot = Promise.promisify(bot.initHubot);
            // initBot(process.env.MATTERMOST_USER, process.env.MATTERMOST_PASSWORD, 'APP', 'ntelagent')
            //     .then(function (robot1) {
            //         logger.debug('Current APP Robot1=' + robot1.adapter.profile.type);
            //         initBot('cyber_wmx', process.env.MATTERMOST_PASSWORD, 'APP', 'ntelagent')
            //             .then(function (robot2) {
            //                 logger.debug('Current APP Robot2=' + robot2.adapter.profile.type);
            //             })
            //     });
            Promise.join(
                // bot.initHubot(process.env.MATTERMOST_USER, process.env.MATTERMOST_PASSWORD, 'APP', 'ntelagent', function() {}),
                // bot.initHubot('cyber_wmx', process.env.MATTERMOST_PASSWORD, 'APP', 'ntelagent', function() {}),
                // require('../bots/botInstance')(process.env.MATTERMOST_USER, process.env.MATTERMOST_PASSWORD, 'APP', 'maingui', function() {}),
                cmListener.init(),
                ivrListenr.init()
            );
        })
        .catch(function (err) {

        })
};

exports.init = init;