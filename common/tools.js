var bcrypt = require('bcryptjs');
var moment = require('moment');
var logger = require('./logger');

// 格式化时间
exports.formatDate = function (date, friendly) {

  logger.debug('=====mongodb date1=====' + date);
  date = moment(date);
  logger.debug('=====mongodb date2=====' + date);
  logger.debug('=====mongodb date3=====' + date.fromNow());

  if (friendly) {
    return date.fromNow();
  } else {
    return date.format('YYYY-MM-DD HH:mm');
  }

};

exports.validateId = function (str) {
  return (/^[a-zA-Z0-9\-_]+$/i).test(str);
};

exports.bhash = function (str, callback) {
  bcrypt.hash(str, 10, callback);
};

exports.bcompare = function (str, hash, callback) {
  bcrypt.compare(str, hash, callback);
};
