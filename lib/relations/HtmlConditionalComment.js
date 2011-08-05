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
    _inline: function () {
        this.node.nodeValue = '[' + this.condition + ']>' + this.to.text + '<![endif]';
    },

    createNode: function (document) {
        return document.createComment();
    }
});

module.exports = HtmlConditionalComment;
