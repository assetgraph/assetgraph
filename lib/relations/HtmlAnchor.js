/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function HtmlAnchor(config) {
    Relation.call(this, config);
}

util.inherits(HtmlAnchor, Relation);

extendWithGettersAndSetters(HtmlAnchor.prototype, {
    get href() {
        return this.node.getAttribute('href');
    },

    set href(href) {
        this.node.setAttribute('href', href);
    },

    inline: function () {
        Relation.prototype.inline.call(this);
        this.href = "data:" + this.to.contentType + ";base64," + this.to.rawSrc.toString('base64');
        this.from.markDirty();
    },

    attach: function (asset, position, adjacentRelation) {
        this.from = asset;
        this.node = this.from.parseTree.createElement('a');
        this.from._attachNode(node, position, adjacentRelation.node);
        Relation.prototype.attach.apply(this, arguments);
    },

    detach: function () {
        this.node.parentNode.removeChild(this.node);
        delete this.node;
        Relation.prototype.detach.call(this);
    }
});

module.exports = HtmlAnchor;
