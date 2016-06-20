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
    if (shadowCount < shadow_info.length) {
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

var setRobot = function (id, aRobot) {
    appRobot[id] = aRobot;
};

var getRobot = function (id) {
    return id in appRobot ? appRobot[id] : null;
};

var delRobot = function (id) {
    delete appRobot[id];
}

var setToken = function (value) {
    token.token = value;
}

var getToken = function () {
    return token.token;
}

module.exports = {setRobot, getRobot, delRobot, getToken, setToken, getCustomerShadow, releaseCustomerShadow};

//exports.setRobot = setRobot;
//exports.getRobot = getRobot;
//exports.delRobot = delRobot;
//exports.getToken = getToken;
//exports.setToken = setToken;
//exports.getCustomerShadow = getCustomerShadow;
//exports.releaseCustomerShadow = releaseCustomerShadow;