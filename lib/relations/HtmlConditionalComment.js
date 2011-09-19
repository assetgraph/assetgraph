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
    inline: function () {
        Relation.prototype.inline.call(this);
        this.node.nodeValue = '[' + this.condition + ']>' + this.to.text + '<![endif]';
        this.from.markDirty();
        return this;
    },

    attach: function (asset, position, adjacentRelation) {
        this.node = asset.parseTree.createComment();
        asset._attachNode(this.node, position, adjacentRelation.node);
        return Relation.prototype.attach.call(this, asset, position, adjacentRelation);
    },

    detach: function () {
        this.node.parentNode.removeChild(this.node);
        delete this.node;
        return Relation.prototype.detach.call(this);
    }
});

module.exports = HtmlConditionalComment;
