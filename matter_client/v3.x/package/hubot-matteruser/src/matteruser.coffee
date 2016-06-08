{Robot,Adapter,TextMessage,User,EnterMessage,LeaveMessage} = require 'hubot'

MatterMostClient = require './client'

class Matteruser extends Adapter

    @mmUser = null;
    @mmPassword = null;

    run: ()->
        mmHost = process.env.MATTERMOST_HOST
        mmUser = @mmUser
        mmPassword = @mmPassword
        mmGroup = process.env.MATTERMOST_GROUP
        mmWSSPort = process.env.MATTERMOST_WSS_PORT or '443'

        unless mmHost?
            @robot.logger.emergency "MATTERMOST_HOST is required"
            process.exit 1
        unless mmUser?
            @robot.logger.emergency "MATTERMOST_USER is required"
            process.exit 1
        unless mmPassword?
            @robot.logger.emergency "MATTERMOST_PASSWORD is required"
            process.exit 1
        unless mmGroup?
            @robot.logger.emergency "MATTERMOST_GROUP is required"
            process.exit 1

        @client = new MatterMostClient mmHost, mmGroup, mmUser, mmPassword, {wssPort: mmWSSPort, pingInterval: 30000}

        @client.on 'open', @.open
        @client.on 'loggedIn', @.loggedIn
        @client.on 'connected', @.onConnected
        @client.on 'message', @.message
        @client.on 'profilesLoaded', @.profilesLoaded
        @client.on 'user_added', @.userAdded
        @client.on 'user_removed', @.userRemoved
        @client.on 'error', @.error

        @robot.brain.on 'loaded', @.brainLoaded

        @robot.on 'slack-attachment', @.slackAttachmentMessage
        @robot.on 'slack.attachment', @.slackAttachmentMessage

        @client.login()

    open: =>
        return true

    error: (err) =>
        @robot.logger.info 'Error: ' + err
        return true

    onConnected: =>
        @robot.logger.info 'Connected to Mattermost.'
        @emit 'connected'
        return true

    userChange: (user) =>
        return unless user?.id?
        newUser =
            name: user.username
            real_name: "#{user.first_name} #{user.last_name}"
            email_address: user.email
            mm: {}
        for key, value of user
            newUser.mm[key] = value
        if user.id of @robot.brain.data.users
            for key, value of @robot.brain.data.users[user.id]
                unless key of newUser
                    newUser[key] = value
        delete @robot.brain.data.users[user.id]
        @robot.brain.userForId user.id, newUser

    loggedIn: (user) =>
        @robot.logger.info 'Logged in as user "'+user.username+'" but not connected yet.'
        @self = user
        @robot.name = @self.username
        return true

    profilesLoaded: =>
        for id, user of @client.users
            @robot.logger.debug 'Adding user '+id
            @userChange user

    brainLoaded: =>
        @robot.logger.info 'Brain loaded'
        for id, user of @client.users
            @userChange user
        return true

    send: (envelope, strings...) ->
        @client.postMessage(str, envelope.room) for str in strings

    reply: (envelope, strings...) ->
        @robot.logger.debug "Reply"
        strings = strings.map (s) -> "@#{envelope.user.name} #{s}"
        @send envelope, strings...

    message: (msg) =>
        @robot.logger.debug msg
        return if msg.user_id == @self.id # Ignore our own output
        @robot.logger.debug 'From: ' + msg.user_id + ', To: ' + @self.id

        mmChannel = @client.getChannelByID msg.channel_id if msg.channel_id
        mmUser = @client.getUserByID msg.user_id
        mmPost = JSON.parse msg.props.post

        @robot.logger.debug 'Received message from '+mmUser.username+': ' + mmPost.message
        user = @robot.brain.userForId msg.user_id
        user.room = msg.channel_id

        text = mmPost.message
        text = "#{@robot.name} #{text}" if msg.props.channel_type == 'D' and !///^#{@robot.name} ///i.test(text) # Direct message

        @receive new TextMessage user, text, msg.id
        @robot.logger.debug "Message sent to hubot brain."
        return true

    userAdded: (msg) =>
        mmUser = @client.getUserByID msg.user_id
        @userChange user
        user = @robot.brain.userForId msg.user_id
        user.room = msg.channel_id
        @receive new EnterMessage user
        return true

    userRemoved: (msg) =>
        mmUser = @client.getUserByID msg.user_id
        user = @robot.brain.userForId msg.user_id
        user.room = msg.channel_id
        @receive new LeaveMessage user
        return true

    slackAttachmentMessage: (data) ->
        return unless data.room
        msg = {}
        msg.text = data.text
        msg.type = "slack_attachment"
        msg.props = {}
        msg.channel_id = data.room
        msg.props.attachments = data.attachments || []
        msg.props.attachments = [msg.props.attachments] unless Array.isArray msg.props.attachments
        if data.username && data.username != @robot.name
            msg.as_user = false
            msg.username = data.username
            if data.icon_url?
                msg.icon_url = data.icon_url
            else if data.icon_emoji?
                msg.icon_emoji = data.icon_emoji
        else
            msg.as_user = true

        @client.customMessage(msg, msg.channel_id)

exports.use = (robot) ->
    new Matteruser robot
