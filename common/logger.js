var config = require('../config');
var env = process.env.NODE_ENV || "development";


var log4js = require('log4js');
log4js.configure({
    appenders: [
        { type: 'console' },
        { type: 'file', filename: 'logs/co-engagement.log', maxLogSize: 2048000, backups: 5, category: 'co-engagement' },
        { type: 'file', filename: 'logs/co-engagement_err.log', maxLogSize: 2048000, backups: 5, category: 'co-engagement-err' }
    ]
});
var logger_debug = log4js.getLogger('co-engagement');
logger_debug.setLevel(config.debug && env !== 'test' ? 'DEBUG' : 'ERROR');

var logger_err = log4js.getLogger('co-engagement-err');
logger_err.setLevel(config.debug && env !== 'test' ? 'DEBUG' : 'ERROR');

var logger = {
    debug: function(text) {
        logger_debug.debug(text);
    },
    error: function(error) {
        logger_err.error(error);
    }
};

module.exports = logger;