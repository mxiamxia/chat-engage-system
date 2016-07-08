/**
 * Created by min on 7/8/16.
 */

var sendMessage = function (robot, socket, room, message, isSocket) {
    if (!isSocket) {
        robot.messageRoom(room, message);
    } else {
        socket.emit('message', message);
    }
};

exports.sendMessage = sendMessage;