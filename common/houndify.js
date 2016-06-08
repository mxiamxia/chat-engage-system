var uuid = require('node-uuid');
var crypto = require('crypto');
var config = require('../config');

var generateAuthHeaders = function(clientId, clientKey, userId, requestId) {

  if (!clientId || !clientKey) {
    throw new Error('Must provide a Client ID and a Client Key');
  }
  // Generate a unique UserId and RequestId.
  userId      = userId || uuid.v1();
  // keep track of this requestId, you will need it for the RequestInfo Object
  requestId   = requestId || uuid.v1();
  var requestData = userId + ';' + requestId;

  // keep track of this timestamp, you will need it for the RequestInfo Object
  var timestamp   = Math.floor(Date.now() / 1000),

    unescapeBase64Url = function (key) {
      return key.replace(/-/g, '+').replace(/_/g, '/');
    },

    escapeBase64Url = function (key) {
      return key.replace(/\+/g, '-').replace(/\//g, '_');
    },

    signKey = function (clientKey, message) {
      var key = new Buffer(unescapeBase64Url(clientKey), 'base64');
      var hash = crypto.createHmac('sha256', key).update(message).digest('base64');
      return escapeBase64Url(hash);

    },

    encodedData = signKey(clientKey, requestData + timestamp),
    headers = {
      'Hound-Request-Authentication': requestData,
      'Hound-Client-Authentication': clientId + ';' + timestamp + ';' + encodedData,
      'Hound-Request-Info': config.Hound_Request_Info
    };
  return headers;
};

exports.generateAuthHeaders = generateAuthHeaders;
