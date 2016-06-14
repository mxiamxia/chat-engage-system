/**
 * Created by min on 4/12/16.
 */


var config = {
  MODE_ENV: 'DEV', //DEV
  CM:'PROLOG',  //or 'PROLOG'
  //CM:'MQ',  //or 'MQ'
  ROCKET_URL: 'www.cyberobject.com:3000',
  CM_URL: 'http://192.168.254.196:18011/ntelagent-chat-web-mobile/HttpService',
  CM_PROLOG: 'http://192.168.254.116:3030/cm',
  HUBOT_SKY: 'http://localhost:8092/skype/message',
  HUBOT_ROCKET: 'http://localhost:8093/rocket/message',
  redis_host: 'localhost',
  redis_port: 6379,
  redis_db: 1,
  redis_expire: 4*60*60, // four hours
  pollInterval: 1000,
  app: 'mattermost',
  debug: true,
  houndy_clientid: '5Tp0jrUv3EK0LXNGLt_u4A==',
  houndy_clientkey: 'vUMKM3lR6J-uGnUfDI4ENeLvNyvyJ56PQwppZqtjU4ETuO6UrozYz0rZ24M94N82w3RPC2WB9fgQhlYi5IVSzg==',
  Hound_Request_Info: '{"ClientID":"5Tp0jrUv3EK0LXNGLt_u4A==","PartialTranscriptsDesired":true,"Latitude":33.9253,"Longitude":-84.3857}',
  houndy_headers: {
    'Hound-Request-Authentication': 'houndify_try_api_user;231e20f0-0b38-11e6-bf95-b9c00c2f1f38',
    'Hound-Client-Authentication': 'uI1km2cRUlcLU2Nuq3MJiw==;1461624641;tMqTAXWLVZ0VcJ9p3X6uqwwnwAsmzkSv7-ZAjY6Jqng=',
    'Hound-Request-Info': '{"ClientID":"uI1km2cRUlcLU2Nuq3MJiw==","PartialTranscriptsDesired":true,"Latitude":33.9253,"Longitude":-84.3857}'
  },
  houndy_url: 'https://api.houndify.com/v1/text?query=',
  callback_url: 'http://192.168.254.122:4011/engagement',
  ENGAGE_MODE: 'TEST'
};

process.env.MATTERMOST_HOST = 'http://192.168.0.55:8065';
process.env.MATTERMOST_GROUP = 'cyber';
process.env.MATTERMOST_USER = 'dev_test@cyberobject.com';
process.env.MATTERMOST_PASSWORD = '123456';
process.env.PORT = 4012;
process.env.MATTERMOST_INVITETOKEN = 'ikfb5ynuhfrtjpfi1u9hi948ur';
process.env.MATTERMOST_AGENT_GROUP = 'hcfstbeietrbik88xhtfp5pkur';

module.exports = config;
