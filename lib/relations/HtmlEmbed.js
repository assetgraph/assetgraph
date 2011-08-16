/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Base = require('./Base');

function HtmlEmbed(config) {
    Base.call(this, config);
}

util.inherits(HtmlEmbed, Base);

extendWithGettersAndSetters(HtmlEmbed.prototype, {
    get href() {
        return this.node.getAttribute('src');
    },

    set href(href) {
        this.node.setAttribute('src', href);
    },

    attach: function (asset, position, adjacentRelation) {
        this.from = asset;
        this.node = this.from.parseTree.createElement('embed');
        this.from._attachNode(node, position, adjacentRelation.node);
        Base.prototype.attach.apply(this, arguments);
    },

    detach: function () {
        this.node.parentNode.removeChild(this.node);
        delete this.node;
        Base.prototype.detach.call(this);
    }
});

module.exports = HtmlEmbed;
