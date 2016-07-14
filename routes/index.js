var express = require('express');
var router = express.Router();
var engageController = require('../controller/engagementController');
var mattermostController = require('../controller/mattermostController');
var loadTestController = require('../controller/loadTestController');


var filePath = __dirname.replace('routes', 'dist/');

router.get('/', function (req, res, next) {
    res.sendFile(filePath + 'index.html');
});

router.get('/about', function (req, res, next) {
});

//receive engagement request from prolog cm
router.get('/engagement', engageController.index);

// testing
router.get('/engagement/accept', engageController.engageAccept);
router.get('/engagement/reject', engageController.engageReject);
router.get('/engagement/logout', engageController.engageLeave);
router.get('/api/createUser', mattermostController.createUser);

router.get('/api/createMultipleUsers', loadTestController.createMultipleUsers);

router.get('/api/sendMessage/:user/:message', loadTestController.sendMessage);



//Admin console
router.get('/api/getActiveSession', mattermostController.getSessionByRange);
router.get('/api/getHistorySession', mattermostController.getAllSessions);
router.get('/api/getAllRobot', mattermostController.getAllRobot);
router.get('/api/getAllSessionKey', mattermostController.getAllSessionKey);
router.get('/api/getTodaySession', mattermostController.getSessionOfToday);
router.get('/api/getTodayEngage', mattermostController.getEngageOfToday);

router.post('/api/deleteSession', mattermostController.deleteSession);


module.exports = router;
