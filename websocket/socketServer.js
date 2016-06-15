/**
 * Created by min on 6/15/16.
 */

var server = require('../bin/www');
var socketioJwt = require('socketio-jwt');
var ioServer = require('socket.io');
var ioServerS = require('socket.io');
var config = require('../config');

var secureioServer = ioServerS.listen(server);

var ioServer = ioServer.listen(server);

secureioServer.set('authorization', socketioJwt.authorize({
    secret: config.jwtSecret,
    handshake: true
}));

secureioServer.sockets
    .on('connection', function (socket) {
        console.log(socket.handshake.decoded_token, 'connected');
        //socket.on('event');
    });

ioServer.sockets
    .on('connection', function (socket) {
        console.log(socket.handshake.decoded_token, 'connected');
        //socket.on('event');
    });

exports.secureioServer = secureioServer;

exports.ioServer = ioServer;


