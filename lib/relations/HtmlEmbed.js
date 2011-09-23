/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function HtmlEmbed(config) {
    Relation.call(this, config);
}

util.inherits(HtmlEmbed, Relation);

extendWithGettersAndSetters(HtmlEmbed.prototype, {
    get href() {
        return this.node.getAttribute('src');
    },

    set href(href) {
        this.node.setAttribute('src', href);
    },

    inline: function () {
        Relation.prototype.inline.call(this);
        this.href = "data:" + this.to.contentType + ";base64," + this.to.rawSrc.toString('base64');
        this.from.markDirty();
        return this;
    },

    attach: function (asset, position, adjacentRelation) {
        this.node = asset.parseTree.createElement('embed');
        asset._attachNode(this.node, position, adjacentRelation);
        return Relation.prototype.attach.call(this, asset, position, adjacentRelation);
    },

    detach: function () {
        this.node.parentNode.removeChild(this.node);
        delete this.node;
        return Relation.prototype.detach.call(this);
    }
});

module.exports = HtmlEmbed;
