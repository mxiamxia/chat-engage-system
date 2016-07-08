/**
 * Created by min on 7/7/16.
 */


var chai = require('chai'),
    mocha = require('mocha'),
    should = chai.should();

var io = require('socket.io-client');

describe("echo", function () {

    beforeEach(function (done) {
        // start the server
        done();
    });

    it("echos message", function (done) {
        var client = io.connect("http://localhost:4012");

        client.on("connect", function () {
            client.on("echo", function (message) {
                message.should.equal("Hello World");
                client.disconnect();
                done();
            });
        });
        client.emit("echo", "Hello World");
    });

});




