/**
 * Created by min on 6/7/16.
 */


var url = require('url');
var querystring = require('querystring');
var logger = require('../common/logger');
var _ = require('lodash');
var engageAction = require('../core/engageAction');
var dispatcher = require('../event/dispatchEvent').pubsub;

var engage = function (req, res) {
    var resOjb = url.parse(req.url);
    logger.debug('engagement query=' + JSON.stringify(querystring.parse(resOjb.query)));
    var response = querystring.parse(resOjb.query).request;
    if (!_.isEmpty(response)) {
        engageAction.transferStart(response);
    }
    res.send('engagement successful');
}

//http://localhost:4012/engagement/accept?channel=7j9h95k68idu8xezh9ybamiisc
var engageAccept = function (req, res) {
    var resOjb = url.parse(req.url);
    logger.debug('engagement request query=' + JSON.stringify(querystring.parse(resOjb.query)));
    var channelId = querystring.parse(resOjb.query).channel;
    var data = {msg_type: 'engage_request_answer', answer: 'accept'};
    dispatcher.emit(channelId + 'engagerequest', data);
    res.send('Emit accept event to ' + channelId);
}

//http://localhost:4012/engagement/reject?channel=7j9h95k68idu8xezh9ybamiisc
var engageReject = function (req, res) {
    var resOjb = url.parse(req.url);
    logger.debug('engagement request query=' + JSON.stringify(querystring.parse(resOjb.query)));
    var channelId = querystring.parse(resOjb.query).channel;
    var data = {msg_type: 'engage_request_answer', answer: 'reject'};
    dispatcher.emit(channelId + 'engagerequest', data);
    res.send('Emit reject event to ' + channelId);
}
//http://localhost:4012/engagement/logout?userid=8es9dxujeibtdnsjqpm74z8faw
var engageLeave = function (req, res) {
    var resOjb = url.parse(req.url);
    logger.debug('engagement request query=' + JSON.stringify(querystring.parse(resOjb.query)));
    var userid = querystring.parse(resOjb.query).userid;
    var data = {msg_type: 'leave_engage'};
    dispatcher.emit(userid + 'engageleave', data);
    res.send('Emit logout shadow user event to ' + userid);
}

exports.index = engage;
exports.engageAccept = engageAccept;
exports.engageReject = engageReject;
exports.engageLeave = engageLeave;