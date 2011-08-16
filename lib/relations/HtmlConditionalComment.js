/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Base = require('./Base');

function HtmlConditionalComment(config) {
    Base.call(this, config);
}

util.inherits(HtmlConditionalComment, Base);

extendWithGettersAndSetters(HtmlConditionalComment.prototype, {
    _inline: function () {
        this.node.nodeValue = '[' + this.condition + ']>' + this.to.text + '<![endif]';
    },

    attach: function (asset, position, adjacentRelation) {
        this.from = asset;
        this.node = this.from.parseTree.createComment();
        this.from._attachNode(node, position, adjacentRelation.node);
        Base.prototype.attach.apply(this, arguments);
    },

    detach: function () {
        this.node.parentNode.removeChild(this.node);
        delete this.node;
        Base.prototype.detach.call(this);
    }
});

module.exports = HtmlConditionalComment;
