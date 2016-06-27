var config = require('../config');

var env = process.env.NODE_ENV || "development"


var log4js = require('log4js');
log4js.configure({
    appenders: [
        {type: 'console'},
        {type: 'file', filename: 'logs/co-engagement.log', maxLogSize: 2048000, backups:5, category: 'co-engagement'}
    ]
});

var logger = log4js.getLogger('co-engagement');
logger.setLevel(config.debug && env !== 'test' ? 'DEBUG' : 'ERROR')

module.exports = logger;
