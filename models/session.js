/**
 * Created by min on 6/22/16.
 */
var mongoose  = require('mongoose');
var BaseModel = require("./base_model");
var Schema    = mongoose.Schema;
var _ = require('lodash');


var SessionSchema = new Schema({
    channel: {type: String},
    sessionId: {type: String},
    customerId: {type: String},
    appId: {type: String},
    engage: {type: Boolean, default: false},
    engage_accept: {type: Boolean, default: false},
    agentId: {type: String},
    create_at: { type: Date, default: new Date() },
    update_at: { type: Date, default: new Date() }
}, {
    versionKey: false // You should be aware of the outcome after set to false
});


SessionSchema.plugin(BaseModel);

SessionSchema.index({sessionId: 1}, {unique: true});

mongoose.model('Session', SessionSchema);