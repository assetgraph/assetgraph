/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function HtmlEdgeSideInclude(config) {
    Relation.call(this, config);
}

util.inherits(HtmlEdgeSideInclude, Relation);

extendWithGettersAndSetters(HtmlEdgeSideInclude.prototype, {
    get href() {
        return this.node.getAttribute('src');
    },

    set href(href) {
        this.node.setAttribute('src', href);
    },

    inline: function () {
        throw new Error("HtmlEdgeSideInclude.inline(): Not implemented yet.");
    },

    attach: function (asset, position, adjacentRelation) {
        this.node = asset.parseTree.createElement('esi:include');
        asset._attachNode(this.node, position, adjacentRelation);
        return Relation.prototype.attach.call(this, asset, position, adjacentRelation);
    },

    detach: function () {
        this.node.parentNode.removeChild(this.node);
        delete this.node;
        return Relation.prototype.detach.call(this);
    }
});

module.exports = HtmlEdgeSideInclude;
