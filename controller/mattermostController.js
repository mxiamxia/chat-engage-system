/**
 * Created by min on 6/13/16.
 */

var url = require('url');
var querystring = require('querystring');
var logger = require('../common/logger');
var _ = require('lodash');
var mattermostApi = require('../api/mattermostApi');


//http://localhost:4012/api/createUser?email=cust_test@cyberobject.com&name=cust_test&password=123456
var createUser = function (req, res) {
    var resObj = url.parse(req.url);
    var result = {'message': 'create User failed'};
    logger.debug('Create User request query=' + JSON.stringify(querystring.parse(resObj.query)));
    var params = querystring.parse(resObj.query);
    mattermostApi.createUser(params.email, params.name, params.password, function(err, body) {
        if (err) {
            next(err);
        }
        result = body;
    });
    res.send(result);
}

exports.createUser = createUser;
