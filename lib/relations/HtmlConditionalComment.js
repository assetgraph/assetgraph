/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    passError = require('../util/passError'),
    Base = require('./Base');

function HtmlConditionalComment(config) {
    Base.call(this, config);
}

util.inherits(HtmlConditionalComment, Base);

_.extend(HtmlConditionalComment.prototype, {
    _inline: function (cb) {
        var that = this;
        that.to.getText(passError(cb, function (text) {
            that.node.nodeValue = '[' + that.condition + ']>' + text + '<![endif]';
            cb();
        }));
    },

    createNode: function (document) {
        return document.createCommment();
    }
});

module.exports = HtmlConditionalComment;
