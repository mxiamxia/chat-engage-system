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
                            if (app === 'dev_cm') {
                                fnArray.push(function(cb){bot.initHubot(app, '123456', 'APP', 'ntelagent', cb)});
                            } else {
                                fnArray.push(function(cb){bot.initHubot(app, '123456', 'APP', app, cb)});
                            }
                        })(i);
                    }
                }
            }

            async.series(fnArray, function (robots) {
                logger.debug('init robots numbers=' + robots.length)
            });

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