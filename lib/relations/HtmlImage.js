/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Base = require('./Base');

function HtmlImage(config) {
    Base.call(this, config);
}

util.inherits(HtmlImage, Base);

extendWithGettersAndSetters(HtmlImage.prototype, {
    get href() {
        return this.node.getAttribute('src');
    },

    set href(href) {
        this.node.setAttribute('src', href);
    },

    _inline: function () {
        this.href = "data:" + this.to.contentType + ";base64," + this.to.rawSrc.toString('base64');
    },

    attach: function (asset, position, adjacentRelation) {
        this.from = asset;
        this.node = this.from.parseTree.createElement('img');
        this.from._attachNode(node, position, adjacentRelation.node);
        Base.prototype.attach.apply(this, arguments);
    },

    detach: function () {
        this.node.parentNode.removeChild(this.node);
        delete this.node;
        Base.prototype.detach.call(this);
    }
});

module.exports = HtmlImage;
