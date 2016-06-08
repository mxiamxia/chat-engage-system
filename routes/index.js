var express = require('express');
var router = express.Router();
var engageController = require('../controller/engagementController');

router.get('/engagement', engageController.index);

module.exports = router;
