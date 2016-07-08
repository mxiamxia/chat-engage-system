/**
 * Created by min on 6/15/16.
 */

// var socketioJwt = require('socketio-jwt');
var io = require('socket.io');
// var ioServerS = require('socket.io');
var config = require('../config');
var logger = require('../common/logger');

var ioServer;

var initSocketServer = function (server) {
    ioServer = io(server);
    ioServer.on('connection', received);

};

var received = function (socket) {
    logger.debug('socket client connected = ' + socket.id);
    socket.on('message', function (message) {
        logger.debug('socket server received message=' + JSON.stringify(message));
    });

    socket.on('echo', function (message) {
        logger.debug('echo message = ' + message);
        socket.emit('echo', message);
    })
};


// var secureioServer = ioServerS(server);


// secureioServer.set('authorization', socketioJwt.authorize({
//     secret: config.jwtSecret,
//     handshake: true
// }));

// secureioServer
//     .on('connection', function (socket) {
//         console.log(socket.handshake.decoded_token, 'connected');
//         //socket.on('event');
//     });

// ioServer.
//     .on('connection', function (socket) {
//         console.log('connected');
//     });

// exports.secureioServer = secureioServer;

exports.initSocketServer = initSocketServer;




