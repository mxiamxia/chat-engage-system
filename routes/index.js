var express = require('express');
var router = express.Router();
var engageController = require('../controller/engagementController');
var mattermostController = require('../controller/mattermostController');

router.get('/', function(req, res, next) {
    res.render('index');
});

router.get('/about', function(req, res, next) {
    res.render('about');
});

router.get('/engagement', engageController.index);
router.get('/engagement/accept', engageController.engageAccept);
router.get('/engagement/reject', engageController.engageReject);
router.get('/engagement/logout', engageController.engageLeave);

//for testing
router.get('/api/createUser', mattermostController.createUser);

module.exports = router;
