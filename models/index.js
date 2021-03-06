var mongoose = require('mongoose');
var config = require('../config');
var logger = require('../common/logger');

mongoose.connect(config.mongodb, {
    server: {poolSize: 20}
}, function (err) {
    if (err) {
        logger.error('connect to %s error: ', config.db, err.message);
        process.exit(1);
    }
});

// models
require('./session');
//require('./topic');
//require('./reply');
//require('./topic_collect');
//require('./message');

exports.Session = mongoose.model('Session');
//exports.Topic = mongoose.model('Topic');
//exports.Reply = mongoose.model('Reply');
//exports.TopicCollect = mongoose.model('TopicCollect');
//exports.Message = mongoose.model('Message');
