/**
 * Created by min on 5/26/16.
 */


var EventEmitter = require('events').EventEmitter;
var EventProxy = require('eventproxy');

var pubsub = new EventEmitter();
pubsub.setMaxListeners(0);  //unlimited listener events max number
var ep = new EventProxy();

pubsub.on('loggedIn', function (msg) {
    console.log(msg);
});

exports.pubsub = pubsub;
exports.eventProxy = ep;