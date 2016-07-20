/**
 * Created by min on 7/20/16.
 */
var TEMP = require('../../common/template');
var uuid = require('node-uuid');
var util = require('util');
var msg = require('../../core/message');

describe('prolog cm', function () {
    it('login function', function () {
        var prologLogin = util.format(TEMP.loginReq, uuid.v1(), uuid.v1(), 'TEST', uuid.v1());
        msg.sendMessage('', '', '', prologLogin, 'cm');
        
    });

});
