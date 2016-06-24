/**
 * Created by min on 6/22/16.
 */

var models  = require('../models');
var Session = models.Session;
var logger  = require('../common/logger');


exports.newAndSave = function (sessionId, appId, customerId, cb) {
    var session = new Session();
    session.sessionId = sessionId;
    session.appId = appId;
    session.customerId = customerId;

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
        session.save(cb);
    });
};

exports.getSessionById = function (sessionId, cb) {
    Session.findOne({sessionId: sessionId}, cb)
};

exports.getSessionByRange = function (date, cb) {
    var dts = "2016-06-23T00:00:15.746Z";

    var dte = "2016-06-23T11:00:15.746Z";
    var datestart = new Date(dts);
    var dateend = new Date(dte);
    //db.getCollection('sessions').find({"create_at": {$gte: new Date("2016-06-23T00:00:15.746Z")}})
    Session.find({"create_at": {$gte: datestart, $lte: dateend}}, function (err, sessions) {
        if (err) {
            return cb(err);
        }
        cb(null, sessions);
    });
};

exports.getAllSessions = function (cb) {
    Session.find({}, '', {sort:{create_at:-1}}, function (err, sessions) {
        if (err) {
            return cb(err);
        }
        cb(null, sessions);
    });
}
