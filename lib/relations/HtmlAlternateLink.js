/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Base = require('./Base');

function HtmlAlternateLink(config) {
    Base.call(this, config);
}

util.inherits(HtmlAlternateLink, Base);

extendWithGettersAndSetters(HtmlAlternateLink.prototype, {
    get href() {
        return this.node.getAttribute('href');
    },

    set href(href) {
        this.node.setAttribute('href', href);
    },

    attach: function (asset, position, adjacentRelation) {
        this.from = asset;
        this.node = this.from.parseTree.createElement('link');
        this.node.setProperty('rel', 'alternate');
        this.node.setProperty('type', this.to.contentType);
        this.from._attachNode(node, position, adjacentRelation.node);
        Base.prototype.attach.apply(this, arguments);
    },

    detach: function () {
        this.node.parentNode.removeChild(this.node);
        delete this.node;
        Base.prototype.detach.call(this);
    }
});

module.exports = HtmlAlternateLink;
