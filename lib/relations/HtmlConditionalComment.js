/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function HtmlConditionalComment(config) {
    Relation.call(this, config);
}

util.inherits(HtmlConditionalComment, Relation);

extendWithGettersAndSetters(HtmlConditionalComment.prototype, {
    _inline: function () {
        this.node.nodeValue = '[' + this.condition + ']>' + this.to.text + '<![endif]';
    },

    attach: function (asset, position, adjacentRelation) {
        this.from = asset;
        this.node = this.from.parseTree.createComment();
        this.from._attachNode(node, position, adjacentRelation.node);
        Relation.prototype.attach.apply(this, arguments);
    },

    detach: function () {
        this.node.parentNode.removeChild(this.node);
        delete this.node;
        Relation.prototype.detach.call(this);
    }
});

module.exports = HtmlConditionalComment;
