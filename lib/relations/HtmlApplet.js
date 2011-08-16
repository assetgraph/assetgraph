/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Base = require('./Base');

// Requires: config.attributeName
function HtmlApplet(config) {
    Base.call(this, config);
}

util.inherits(HtmlApplet, Base);

extendWithGettersAndSetters(HtmlApplet.prototype, {
    get href() {
        return this.node.getAttribute(this.attributeName);
    },

    set href(href) {
        this.node.setAttribute(this.attributeName, href);
    },

    attach: function (asset, position, adjacentRelation) {
        this.from = asset;
        this.node = this.from.parseTree.createElement('applet');
        this.from._attachNode(node, position, adjacentRelation.node);
        Base.prototype.attach.apply(this, arguments);
    },

    detach: function () {
        this.node.parentNode.removeChild(this.node);
        delete this.node;
        Base.prototype.detach.call(this);
    }
});

module.exports = HtmlApplet;
