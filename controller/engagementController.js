/**
 * Created by min on 6/7/16.
 */


var url = require('url');
var querystring = require('querystring');
var logger = require('../common/logger');
var _ = require('lodash');
var engageAction = require('../core/engageAction');

var engage = function (req, res) {
    var resOjb = url.parse(req.url);
    logger.debug('engagement query=' + JSON.stringify(querystring.parse(resOjb.query)));
    var response = querystring.parse(resOjb.query).request;
    if (!_.isEmpty(response)) {
        engageAction.transferStart(response);
    }
    res.send('engagement successful');
}

exports.index = engage;
