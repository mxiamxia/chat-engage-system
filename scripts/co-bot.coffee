#
#This project is create by mxia (mxiamxia@gmail.com)
#to support iplatform multiple channel
#

config = require '../config'
cache = require '../common/cache'
logger = require '../common/logger'
poll = require '../common/poll'
io_socket = require 'socket.io'
cm = require '../core/conversation'
prologCm = require '../core/prologCm'
path = require 'path'
url = require 'url'
querystring = require 'querystring'
_ = require 'lodash'

module.exports = (robot) ->

  io =  io_socket robot.server

  io.on 'connection', (socket) ->
    logger.debug('socket id=' + socket.id)

    socket.on 'new message', (data) ->
      logger.debug('received data=' + JSON.stringify(data))
      id = data.userid
      text = data.input
      self = false
      if config.CM is 'PROLOG'
        prologCm.processPrologMessage id, text, robot, socket, self, null
      else
        cm.processMessage id, text, robot, socket, self, null

  robot.respond /(.*)/i, (msg) ->
    text = msg.match[1]
    logger.debug robot.adapter.profile.type + ' received message text='  + text
    if _.isEmpty text
      robot.reply 'Invalid message format'
    text = JSON.parse text
    id = msg.envelope.user?.id
    room = msg.envelope.room
    logger.debug 'room of message = ' + room
    self = true
    if config.CM is 'PROLOG'
      prologCm.processPrologMessage id, text, robot, null, self, 'MM', room
    else
      id = id + '@@mq'
      cm.processMessage id, text, robot, null, self, room

  robot.error (err, res) ->
    robot.logger.error "DOES NOT COMPUTE"
    if res?
      res.reply "DOES NOT COMPUTE"
