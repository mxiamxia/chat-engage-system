var express = require('express');
var router = express.Router();
var engageController = require('../controller/engagementController');
var mattermostController = require('../controller/mattermostController');


var filePath = __dirname.replace('routes', 'dist/');

router.get('/', function (req, res, next) {
    res.sendFile(filePath + 'index.html');
});

router.get('/about', function (req, res, next) {
});

router.get('/engagement', engageController.index);
router.get('/engagement/accept', engageController.engageAccept);
router.get('/engagement/reject', engageController.engageReject);
router.get('/engagement/logout', engageController.engageLeave);

//for testing
router.get('/api/createUser', mattermostController.createUser);

router.get('/api/getActiveSession', mattermostController.getSessionByRange);

router.get('/api/getHistorySession', mattermostController.getAllSessions);

router.get('/api/getAllRobot', mattermostController.getAllRobot);
router.get('/api/getAllSessionKey', mattermostController.getAllSessionKey);

router.post('/api/deleteSession', mattermostController.deleteSession);
router.get('/api/getTodaySession', mattermostController.getSessionOfToday);
router.get('/api/getTodayEngage', mattermostController.getEngageOfToday);



module.exports = router;
