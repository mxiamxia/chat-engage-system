/**
 * Created by min on 5/26/16.
 */


var EventEmitter = require('events').EventEmitter;
var EventProxy = require('eventproxy');

var pubsub = new EventEmitter();
var ep = new EventProxy();

pubsub.on('loggedIn', function(msg) {
  console.log(msg);
});

exports.pubsub = pubsub;
exports.eventProxy = ep;