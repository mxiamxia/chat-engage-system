/**
 * Created by min on 5/17/16.
 */

var _ = require('lodash');
var util = require('util');
var xulTemp = require('./xulTemplate');

var processXur = function (data) {
    var result = null;

    console.log('xul data==' + JSON.stringify(data));
    //console.log('body=' + data.body);
    //console.log('body.result=' + data.body.result);
    //console.log('body.result.msg=' + data.body.result.msg);
    //console.log('body.result.msg[0].response=' + data.body.result.msg[0].info.xur.response);
    //console.log('body.result.msg[0].response.dialog=' + data.body.result.msg[0].info.xur.response.dialog);
    if (data && data.body
        && data.body.result
        && data.body.result.msg
        && data.body.result.msg[0].info.xur.response
        && data.body.result.msg[0].info.xur.response.dialog) {
        console.log('dialog exist');
        var dialog = data.body.result.msg[0].info.xur.response.dialog;
        if (!_.isEmpty(dialog.askdialog)) {
            var label = dialog.askdialog.label[1];
            result = label['@value'];
        } else if (!_.isEmpty(dialog.choosedialog)) {
            var sessionid = data.header.sessionId;
            var label = dialog.choosedialog.label[1];
            var options = label['@value'];
            if (options.indexOf('\\n') > 0) {
                var optionList = options.split('\\n');
                console.log('optionlist==' + optionList);
                var title = optionList.shift().trim();
                var dropdownList = '';
                optionList.forEach(function (option) {
                    if (option.indexOf('.') > -1) {
                        option = option.substring(option.indexOf('.') + 2);
                        //option = option.replace('\'', "\\\'");
                        var optionText = '<option value="%s">%s</option>';
                        option = option.trim();
                        optionText = util.format(optionText, option, option);
                        dropdownList = dropdownList.concat(optionText);
                    }
                });
                var chooseTemp = xulTemp.dropdownCard;
                result = util.format(chooseTemp, sessionid, title, dropdownList);
            }

        } else {

        }
    }
    return result;
}

exports.processXur = processXur;
