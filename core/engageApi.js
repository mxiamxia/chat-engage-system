/**
 * Created by min on 6/17/16.
 */
var template = require('../common/template');
var util = require('util');
var request = require('request');
var config = require('../config');
var logger = require('../common/logger');

var engageLeave = function (sessionId, agentId, cb) {
    var req = util.format(template.engageLeave, sessionId, agentId);

    apiCall('POST', req, cb);
};

var engageAccept = function (sessionId, agentId, cb) {
    var req = util.format(template.transferAcceptReq, sessionId, agentId);

    apiCall('POST', req, cb);
};

var apiCall = function(method, data, cb) {
    logger.debug('Request sent to Prolog CM=' + data);
    var options = {
        uri: config.CM_PROLOG,
        method: method,
        qs: {request: data},
        headers: {'Content-Type': 'application/xml'}
    };

    request(options, function (err, response, body) {
        if (err || response.statusCode !== 200) {
            cb(new Error('error out'));
            return;
        }
        cb(null, body);
    });

};


exports.engageLeave = engageLeave;
exports.engageAccept = engageAccept;