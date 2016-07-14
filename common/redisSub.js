/**
 * Created by min on 7/8/16.
 */


// var redis = require("redis")
//     , subscriber = redis.createClient()
//     , publisher  = redis.createClient();

var config = require('../config');
var logger = require('../common/logger');

var Redis = require('ioredis');

var subscriber = new Redis({
    port: config.redis_port,
    host: config.redis_host,
    db: config.redis_db,
    retryStrategy: function (times) {
        var delay = Math.min(times * 2, 2000);
        return delay;
    }
});

var publisher = new Redis({
    port: config.redis_port,
    host: config.redis_host,
    db: config.redis_db,
    retryStrategy: function (times) {
        var delay = Math.min(times * 2, 2000);
        return delay;
    }
});

logger.debug('Init redis sub/pub listener.');

exports.Pub = publisher;
exports.Sub = subscriber;
