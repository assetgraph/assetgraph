/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    error = require('../error'),
    Base = require('./Base').Base;

function HTMLConditionalComment(config) {
    Base.call(this, config);
}

util.inherits(HTMLConditionalComment, Base);

_.extend(HTMLConditionalComment.prototype, {
    _inline: function (cb) {
        var that = this;
        that.to.serialize(error.passToFunction(cb, function (src) {
            that.node.nodeValue = '[' + that.condition + ']>' + src + '<![endif]';
            cb();
        }));
    },

    createNode: function (document) {
        return document.createCommment();
    }
});

exports.HTMLConditionalComment = HTMLConditionalComment;
