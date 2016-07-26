/**
 * Created by min on 7/26/16.
 */
var pool = require('./index').pg_pool;
var logger = require('../common/logger');
var _ = require('lodash');

var getPasswordByEmail = function (email, cb) {
    pool.query('select password from users where email = $1', [email])
        .then(function (result) {
            logger.debug('pg query getPasswordByEmail result=' + JSON.stringify(result.rows));
            if (result.rows && result.rows.length > 0) {
                cb(null, result.rows[0]);
            } else {
                cb('no match result');
            }
        });
};

exports.getPasswordByEmail = getPasswordByEmail;

var getPasswordByUser = function (username, cb) {
    pool.query('select password from users where username = $1', [username])
        .then(function (result) {
            logger.debug('pg query getPasswordByUser result=' + JSON.stringify(result.rows));
            if (result.rows && result.rows.length > 0) {
                cb(null, result.rows[0]);
            } else {
                cb('no match result');
            }
        });
};
exports.getPasswordByUser = getPasswordByUser;