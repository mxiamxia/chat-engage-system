/**
 * Created by min on 7/19/16.
 */

var cmListener = require('./cmListenter');
var ivrListenr = require('./ivrListener');
var init = function () {
    //init robot instance
    require('../bots/botInstance')(process.env.MATTERMOST_USER, process.env.MATTERMOST_PASSWORD, 'APP', function () {});
    cmListener.init();
    ivrListenr.init();
}

exports.init = init;