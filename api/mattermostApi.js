/**
 * Created by min on 6/13/16.
 */


var request = require('request');
var config = require('../config');
var TextEncoder = require('text-encoding');
var logger = require('../common/logger');
var robotManager = require('../core/robotManager');


//http://192.168.0.55:8065/api/v3/users/create?d=&iid=ikfb5ynuhfrtjpfi1u9hi948ur
var createUser = function (email, password, name, cb) {
    var postData = {email: email, username: name, password: password, allow_marketing: true};
    var path = '/api/v3/users/create?d=&iid=' + process.env.MATTERMOST_INVITETOKEN;

    apiCall('POST', path, postData, null, cb);

};

exports.createUser = createUser;

//http://localhost:8065/api/v3/teams/1kzc7hu97pbpurwfratamj6ogh/channels/create_direct
var createChannelId = function (id, token, teamId, cb) {
    var postData = {user_id: id};
    var path = '/api/v3/teams/' + teamId + '/channels/create_direct';
    apiCall('POST', path, postData, token, cb);
};

exports.createChannelId = createChannelId;

//http://192.168.0.55:8065/api/v3/teams/j3fpncofhpncbdm8c197qumynr/channels/f45kjodj37g3tgmqj47i9h1nph/extra_info

var getEngagementAgentList = function (teamId, token, cb) {
    var groupId = process.env.MATTERMOST_AGENT_GROUP;
    var path = '/api/v3/teams/' + teamId + '/channels/' + groupId + '/extra_info';
    apiCall('GET', path, null, token, cb);

};
exports.getEngagementAgentList = getEngagementAgentList;

//http://192.168.0.55:8065/api/v3/users/logout
var logoutUser = function (token, cb) {
    var path = '/api/v3/users/logout';
    apiCall('POST', path, null, token, cb);

}
exports.logoutUser = logoutUser;


var apiCall = function (method, path, data, token, cb) {
    logger.debug('Mattermost api request = ' + JSON.stringify(data));

    var options = {
        uri: process.env.MATTERMOST_HOST + path,
        method: method,
        json: data,
        headers: {
            'Content-Type': 'application/json'
        }
    };

    if (token) {
        options.headers['Authorization'] = 'BEARER ' + token;
    }

    logger.debug('Mattermost request path: ' + path);
    logger.debug('Mattermost api request options= ' + JSON.stringify(options));

    request(options, function (err, response, body) {
        if (err) {
            logger.debug('Mattermost request failed: ' + path);
            cb(err);
        }
        cb(null, body);
    });
}