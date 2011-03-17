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
    _inline: function (src) {
        this.node.nodeValue = '[' + this.condition + ']>' + src + '<![endif]';
    },

    createNode: function (document) {
        return document.createCommment();
    }
});

exports.HTMLConditionalComment = HTMLConditionalComment;
