/**
 * Created by min on 6/8/16.
 */

var appRobot = {};
var shadowCount = 0;
var token = {};
var getCustomerShadow = function () {
    var shadow_info = [
        {'name': 'cust_s1@cyberobject.com', 'password': '123456', 'type': 'CUSTOMER'},
        {'name': 'cust_s2@cyberobject.com', 'password': '123456', 'type': 'CUSTOMER'}
    ];
    if(shadowCount < shadow_info.length) {
        var profile = shadow_info[shadowCount];
        shadowCount++;
        return profile;
    }
    return null;
};

var releaseCustomerShadow = function () {
    if (shadowCount > 0) {
        shadowCount--;
    }
};

var setRobot = function (aRobot) {
    appRobot.robot = aRobot;
};

var getRobot = function () {
    return appRobot.robot;
};

var setToken = function (value) {
    token.token = value;
}

var getToken = function () {
    return token.token;
}

exports.setRobot = setRobot;
exports.getRobot = getRobot;
exports.getToken = getToken;
exports.setToken = setToken;
exports.getCustomerShadow = getCustomerShadow;
exports.releaseCustomerShadow = releaseCustomerShadow;