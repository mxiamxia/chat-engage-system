/**
 * Created by min on 5/26/16.
 */


var EventEmitter = require('events').EventEmitter;

var pubsub = new EventEmitter();

pubsub.on('loggedIn', function(msg) {
  console.log(msg);
});

exports.pubsub = pubsub;
