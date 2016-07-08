/**
 * Created by min on 7/8/16.
 */


var redis = require("redis")
    , subscriber = redis.createClient()
    , publisher  = redis.createClient();

subscriber.on("message", function(channel, message) {
    console.log("Message '" + message + "' on channel '" + channel + "' arrived!")
});

subscriber.subscribe("chat");

publisher.publish("chat", "haaaaai");
