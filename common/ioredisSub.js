/**
 * Created by min on 7/8/16.
 */

var Redis = require('ioredis');
var logger = require('./logger');
var config = require('../config');

var sub = new Redis({
    port: config.redis_port,
    host: config.redis_host,
    db: config.redis_db
});
var pub = new Redis({
    port: config.redis_port,
    host: config.redis_host,
    db: config.redis_db
});

sub.subscribe('chat', function (err, count) {
    if (err) {
        logger.debug('Can not reach to Redis server');
        return;
    }
    logger.debug('Subscribed to Redis server with channel chat');
});

sub.on('message', function (channel, message) {
    logger.debug('Receive message %s from channel %s', message, channel);
});

sub.on('messageBuffer', function (channel, message) {

});

exports.publisher = pub;
