var redis = require('./redis');
var _ = require('lodash');
var logger = require('./logger');
var Promise = require('bluebird');

var get = function (key, callback) {
    var t = new Date();
    redis.get(key, function (err, data) {
        if (err) {
            return callback(err);
        }
        if (!data) {
            return callback();
        }
        data = JSON.parse(data);
        var duration = (new Date() - t);
        logger.debug('Cache', 'get', key, (duration + 'ms'));
        callback(null, data);
    });
};

exports.get = get;
exports.pget = Promise.promisify(get);

var set = function (key, value, time, callback) {
    var t = new Date();

    if (typeof time === 'function') {
        callback = time;
        time = null;
    }
    callback = callback || _.noop;
    value = JSON.stringify(value);

    if (!time) {
        redis.set(key, value, callback);
    } else {
        redis.setex(key, time, value, callback);
    }
    var duration = (new Date() - t);
    logger.debug("Cache", "set", key, (duration + 'ms'));
};

exports.set = set;

var remove = function (key) {
    var t = new Date();
    redis.del(key);
    var duration = (new Date() - t);
    logger.debug('Cache', 'delete', key, (duration + 'ms'));
}

exports.remove = remove;

//var promise = redis.pipeline().set('foo', 'bar').get('foo').exec();
//promise.then(function (result) {
//  // result === [[null, 'OK'], [null, 'bar']]
//});
var pipeline = function () {
    return redis.pipeline();
};
exports.pipeline = pipeline;


//move out of redis util file
var getSessionById = function (id, callback) {
    get(id, function (err, value) {
        if (value) {
            get('ss'+value.sessionId, function (err, sessionData) {
                if (sessionData) {
                    callback(null, sessionData);
                } else {
                    callback('no session data found');
                }
            });
        } else {
            callback('no session data found');
        }
    });
};

exports.getSessionById = getSessionById;

var getKeys = function (pattern, cb) {
    var stream = redis.scanStream({
        match: pattern//'ss*'
    });
    var keys = [];
    stream.on('data', function (resultKeys) {
        for (var i = 0; i < resultKeys.length; i++) {
            keys.push(resultKeys[i]);
        }
    });
    stream.on('end', function () {
        logger.debug('done with the keys: ', keys.length);
        cb(null, keys);
    });
};

exports.getKeys = getKeys;

