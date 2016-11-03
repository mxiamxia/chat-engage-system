/**
 * Created by min on 4/13/16.
 */

var moment = require('moment');

var TEMP = {

    loginReq: '<message> <header> <action value="login" /> <userid value="%s" /> <sessionid value="%s" /> <orgid value="cyberobject" /> <appid value="%s" /> <debugid value="" /> <app value="%s" /> <channel value="%s" /> <queue value="%s" /></header> <body> <usertype value="%s" /> <channel value="CCSA" /> </body> </message>',
    conversationReq: "<message><header><action value='conversation' /><sessionid value='%s' /><userid value='%s'/><debug id=''/><app value='%s' /><appid value='%s' /><prop value='%s' /><from value='%s' /></header><body><message><![CDATA[%s]]></message></body></message>",
    conversationIvrReq: "<message><header><action value='conversation' /><sessionid value='%s' /><userid value='%s'/><debug id=''/><app value='%s' /><appid value='%s' /><prop value='%s' /><from value='%s' /></header><body><message><![CDATA[%s]]></message><audio src='%s'></audio></body><status> <code value='%s' /> <text value='%s' /> </status></message>",
    transferAcceptReq: '<message> <header> <action value="transfer_accept" /> <sessionid value="%s" /> <userid value="%s" /> </header> </message>',
    engageLeave: '<message> <header> <action value="transfer_leave" /> <sessionid value="%s" /> <userid value="%s"/> </header> <body></body> </message>',
    cleanSession: '<message> <header> <action value="session_clean/> <sessionid value="%s"/> <userid value="%s"/> </header> <body/> </message>',

    audioCard: '<?xml version="1.0" encoding="UTF-8"?> <response> <header> <action value="conversation"/> <sessionid value="%s"/> <userid value="%s"/> <debug id=""/> <app value="ivr"/> <prop value="{}"/> <from value="%s"/> </header> <body> <statement> <xul><audio_card typeof="AUDIO" xmlns="http://www.cyberobject.com/2012/12/term/ui#" xmlns:s="http://www.cyberobject.com/2012/12/session#%s/ui" xmlns:term="http://www.cyberobject.com/2012/12/term#"> <audio id="s:x424203559" src="%s">%s</audio> </audio_card> </xul> </statement> </body> </response>',
    engageAudioCard: '<?xml version="1.0" encoding="UTF-8"?> <response> <header> <action value="conversation"/> <sessionid value="%s"/> <userid value="%s"/> <debug id=""/> <app value="ivr"/> <prop value="{}"/> <from value="%s"/> </header> <body> <statement> <xul> %s <audio_card typeof="AUDIO" xmlns="http://www.cyberobject.com/2012/12/term/ui#" xmlns:s="http://www.cyberobject.com/2012/12/session#%s/ui" xmlns:term="http://www.cyberobject.com/2012/12/term#"> <audio id="s:x424203559" src="%s">%s</audio> </audio_card> </xul> </statement> </body> </response>',


    cmLogin: {
        "header": {
            "action": "InitChatEnv",
            "moduleName": "",
            "sessionId": "",
            "ip": "",
            "requestId": "",
            "requestTime": moment().format('MM-DD-YYYY HH:mm:ss a')
        },
        "body": {
            "clientType": "http",
            "appid": "maingui",
            "debugid": "",
            "welcome": "connect",
            "dmode": "true"
        },
        "status": {
            "code": "0000",
            "message": "",
            "exception": ""
        }
    },
    cmConversation: {
        "header": {
            "action": "Sender",
            "moduleName": "",
            "sessionId": "", // required
            "ip": "",
            "requestId": "",
            "requestTime": moment().format('MM-DD-YYYY HH:mm:ss a')
        },
        "body": {
            "msg": "", //required - text
            "username": "TNeAMmIp@cyberobject.com", // required
            "appid": "maingui",
            "questionid": "",  //optional
            "robotjid": "",  //required
            "dmode": "true"
        },
        "status": {
            "code": "0000",
            "message": "",
            "exception": ""
        }
    },
    cmListener: {
        "header": {
            "action": "Listener",
            "moduleName": "",
            "sessionId": "",  //required
            "ip": "",
            "requestId": "",
            "requestTime": moment().format('MM-DD-YYYY HH:mm:ss a')
        },
        "body": {
            "username": "", //required
            "dmode": "true"
        },
        "status": {
            "code": "0000",
            "message": "",
            "exception": ""
        }
    }
}

module.exports = TEMP
