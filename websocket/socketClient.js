/**
 * Created by min on 6/15/16.
 */

var ioClient = require('socket.io-client');
var ioClientS = require('socket.io-client');
var config = require('../config')
var socket = ioClient.connect('localhost:4012');

var jwt = '';

var secure_socket = ioClientS.connect(config.HUBOT_MATTER_ROOT, {
    query: 'token=' + jwt
});

socket.on('connect', function () {
    console.log('connected to socket server');
}).on('disconnect', function () {
    console.log('disconnected');
});

secure_socket.on('connect', function () {
    logger.debug("Connected to socket server: " + config.HUBOT_MATTER_ROOT);
}).on('disconnect', function () {
    console.log('disconnected');
});


exports.socket = socket;
exports.secureSocket = secure_socket;

