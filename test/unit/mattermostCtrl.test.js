/**
 * Created by min on 10/14/16.
 */

var app = require('../../app');
var request = require('supertest')(app);
var should = require('should');


describe('test/router/houndifyController.test.js', function () {

    it('CreateAppUser invalid input', function (done) {
        request.post('/createapp')
            .send({userType: 'APP', password: 'aaa'})
            .end(function (err, res) {
                res.status.should.equal(500);
                res.text.should.equal('Invalid input');
                done()
            })
    });

    it('CreateAppUser normal input', function (done) {
        request.post('/createapp')
            .send({userType: 'APP', userName: 'mxia', password: 'aaa'})
            .end(function (err, res) {
                res.text.should.equal('Created App user successfully');
                done();
            })
    });
});