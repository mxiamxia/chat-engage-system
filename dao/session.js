/**
 * Created by min on 6/22/16.
 */

var models  = require('../models');
var Session = models.Session;
var logger  = require('../common/logger');


exports.newAndSave = function (sessionId, appId, customerId, app, cb) {
    var session = new Session();
    session.channel = app;
    session.sessionId = sessionId;
    session.appId = appId;
    session.customerId = customerId;
    session.create_at = new Date();
    session.save(cb);
};

exports.updateSession = function (sessionId, engage, accept, agentId, cb) {
    Session.findOne({sessionId: sessionId}, function (err, session) {
        if (err) {
            return cb(err);
        }
        logger.debug('Update MongoDB create time = ' + session.create_at);

        session.engage = engage;
        session.engage_accept = accept;
        session.agentId = agentId;
        session.update_at = new Date();
        session.save(cb);
    });
};

exports.getSessionById = function (sessionId, cb) {
    Session.findOne({sessionId: sessionId}, cb)
};

exports.getSessionByRange = function (date, cb) {
    var dts = "2016-06-23T00:00:15.746Z";

    var dte = "2016-06-23T11:00:15.746Z";
    var start = new Date();
    start.setHours(0,0,0,0);

    var end = new Date();
    end.setHours(23,59,59,999);
    //db.getCollection('sessions').find({"create_at": {$gte: new Date("2016-06-23T00:00:15.746Z")}})
    Session.find({"create_at": {$gte: start, $lte: end}}, function (err, sessions) {
        if (err) {
            return cb(err);
        }
        cb(null, sessions);
    });
};

//get the last 200 conversations
exports.getAllSessions = function (cb) {
    Session
        .find({})
        .sort({create_at:-1})
        //.limit(200)
        .exec(function (err, sessions) {
            if (err) {
                return cb(err);
            }
            cb(null, sessions);
        });
    //Session.find({}, '', {sort:{create_at:-1}}, function (err, sessions) {
    //    if (err) {
    //        return cb(err);
    //    }
    //    cb(null, sessions);
    //});
};

exports.getSessionOfToday = function (cb) {
    var start = new Date();
    start.setHours(0,0,0,0);
    var end = new Date();
    end.setHours(23,59,59,999);

    Session.count({"create_at": {$gte: start, $lte: end}}, function (err, nums) {
        if (err) {
            return cb(err);
        }
        logger.debug('Today\'s session number=' + nums);
        cb(null, nums);
    });
};

//db.getCollection('sessions').aggregate([{$group:{_id:"sessionId", num:{$sum:1}}}])

exports.getEngageOfToday = function (cb) {
    var start = new Date();
    start.setHours(0,0,0,0);
    var end = new Date();
    end.setHours(23,59,59,999);

    Session.count({"create_at": {$gte: start, $lte: end}, "engage": true}, function (err, nums) {
        logger.debug('Today\'s engage number=' + nums);
        cb(null, nums);
    });
};