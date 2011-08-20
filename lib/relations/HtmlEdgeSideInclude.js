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

    attach: function (asset, position, adjacentRelation) {
        this.from = asset;
        this.node = this.from.parseTree.createElement('esi:include');
        this.from._attachNode(node, position, adjacentRelation.node);
        Relation.prototype.attach.apply(this, arguments);
    },

    detach: function () {
        this.node.parentNode.removeChild(this.node);
        delete this.node;
        Relation.prototype.detach.call(this);
    }
});

module.exports = HtmlEdgeSideInclude;
