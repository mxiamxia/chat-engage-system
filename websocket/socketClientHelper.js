/**
 * Created by min on 7/7/16.
 */
var socket = require('./socketClient');
var logger = require('../common/logger');


socket.on('response', function (message) {
    logger.debug('socket client receieved message=' + JSON.stringify(message));
});

var emitMessage = function (message) {
    socket.emit('new message', message);
};

exports.emitMessage = emitMessage;