/**
 * Created by min on 6/8/16.
 */

var appRobot = {};

var customerShadow = [
    {'name': 'cust_s1@cyberobject.com', 'password': '123456', 'type': 'CUSTOMER'},
    {'name': 'cust_s2@cyberobject.com', 'password': '123456', 'type': 'CUSTOMER'}
];

var setRobot = function (id, robot, type) {
    var data = {'type': type, 'robot': robot};
    appRobot.id = data;
}

var getRobot = function (id) {
    if (appRobot.id) {
        return appRobot.id.robot;
    }
}

exports.setRobot = setRobot;
exports.getRobot = getRobot;
exports.customerShadow = customerShadow;