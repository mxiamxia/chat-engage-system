/**
 * Created by min on 7/26/16.
 */

var pg = require('pg');
var config = require('../config');
var logger = require('../common/logger');
// you can optionally supply other values
var config = {
    host: config.pg_host,
    user: config.pg_user, //env var: PGUSER
    database: config.pg_db, //env var: PGDATABASE
    password: config.pg_password, //env var: PGPASSWORD
    port: config.pg_port, //env var: PGPORT
    max: config.pg_max, // max number of clients in the pool
    idleTimeoutMillis: config.pg_idleTimeoutMillis // how long a client is allowed to remain idle before being closed
};

var pool = new pg.Pool(config);

pool.on('error', function (err, client) {
    logger.error('idle client error=', err.message, err.stack)
});

process.on('unhandledRejection', function(err) {
    logger.error('unhandledRejection error=', err.message, err.stack)
})

exports.pg_pool = pool;