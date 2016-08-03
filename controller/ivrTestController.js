/**
 * Created by min on 8/3/16.
 */

var Pub = require('../common/redisSub').Pub;
var logger = require('../common/logger');
var msg = {
    app: 'IVR',
    channel_id: 'qCcBj3hm@cyberobject.com',
    create_at: 1470238551890,
    filenames: [],
    message: '<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n\n<response><header><action value=\"conversation\"/><sessionid value=\"qCcBj3hm@cyberobject.com\"/><userid value=\"qCcBj3hm@cyberobject.com\"/><debug id=\"\"/><app value=\"ivr\"/><prop value=\"{&quot;msg_type&quot;:&quot;conversation&quot;,&quot;audio&quot;:&quot;http://www.cyberobject.com:8082/iplatform-client-voxeo-voice-redis/record/3c246a2478bc24784e9e0a8269723905_7.mp3&quot;}\"/><from value=\"qCcBj3hm@cyberobject.com\"/></header><body><statement><xul><info_card id=\"s:x2090945899\" typeof=\"INFO\" xmlns=\"http://www.cyberobject.com/2012/12/term/ui#\" xmlns:s=\"http://www.cyberobject.com/2012/12/session#qCcBj3hm@cyberobject.com/ui\" xmlns:term=\"http://www.cyberobject.com/2012/12/term#\"><question typeof=\"HTML\">The lariat has an eye, or a honda, tied at one end, through which the other end is threaded to form a big loop (4 to 6 feet in diameter). The 25-foot rope is generally a 10-millimeter-thick, 3- or 4-ply polyester cord (to limit stretching) with a stiffness, or lay, of extra-soft, soft, or firm. To throw, move your wrist in a counterclockwise direction and swing above your head. For the rope to hit your targe</question></info_card></xul></statement><question><xul><ask_card id=\"s:x341088552\" typeof=\"ASK\" xmlns=\"http://www.cyberobject.com/2012/12/term/ui#\" xmlns:s=\"http://www.cyberobject.com/2012/12/session#qCcBj3hm@cyberobject.com/ui\" xmlns:term=\"http://www.cyberobject.com/2012/12/term#\"><question typeof=\"HTML\">Any questions?</question><options id=\"cyberobject/ntelagent/Document/Rope_Steer.vsd#s0.27\"><option id=\"s:x184590799\" typeof=\"BUTTON\" sameas=\"yes\" reply=\"Yes\">Yes</option><option id=\"s:x1877027475\" typeof=\"BUTTON\" sameas=\"no\" reply=\"No\">No</option></options></ask_card></xul></question></body></response>',
    props: {},
    user_id: 'qCcBj3hm@cyberobject.com'
};

var sendIVRMsg = function (req, res, next) {
    logger.debug('send test message to IVR=' + JSON.stringify(msg));
    Pub.rpush('ivrmin', JSON.stringify(msg));
}

exports.sendIVRMsg = sendIVRMsg;
