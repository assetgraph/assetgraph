/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function HtmlRelation(config) {
    Relation.call(this, config);
}

util.inherits(HtmlRelation, Relation);

extendWithGettersAndSetters(HtmlRelation.prototype, {
    baseAssetQuery: {isInline: false, type: 'Html'},

    // Override in subclass for relations that don't support inlining, are attached to attributes, etc.
    inline: function () {
        Relation.prototype.inline.call(this);
        this.href = "data:" + this.to.contentType + ";base64," + this.to.rawSrc.toString('base64');
        this.from.markDirty();
        return this;
    },

    attachNodeBeforeOrAfter: function (position, adjacentRelation) {
        if (position !== 'before' && position !== 'after') {
            throw new Error("HtmlRelation._attachNode: The 'position' parameter must be either 'before' or 'after'");
        }
        var adjacentNode = (position === 'after' && adjacentRelation.endNode) || adjacentRelation.node,
            parentNode = adjacentNode.parentNode;
        if (!parentNode) {
            throw new Error("assets.Html._attachNode: Adjacent node has no parentNode.");
        }
        if (position === 'after') {
            parentNode.insertBefore(this.node, adjacentNode.nextSibling);
        } else {
            parentNode.insertBefore(this.node, adjacentNode);
        }
    },

    // Override in subclass for relations that aren't detached by removing this.node from the DOM.
    detach: function () {
        this.node.parentNode.removeChild(this.node);
        delete this.node;
        return Relation.prototype.detach.call(this);
    }
});

module.exports = HtmlRelation;
