/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function HtmlShortcutIcon(config) {
    Relation.call(this, config);
}

util.inherits(HtmlShortcutIcon, Relation);

extendWithGettersAndSetters(HtmlShortcutIcon.prototype, {
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
        return this;
    },

    attach: function (asset, position, adjacentRelation) {
        this.node = asset.parseTree.createElement('link');
        this.node.setAttribute('rel', 'shortcut icon'); // Hmm, how to handle apple-touch-icon?
        asset._attachNode(this.node, position, adjacentRelation);
        return Relation.prototype.attach.call(this, asset, position, adjacentRelation);
    },

    detach: function () {
        this.node.parentNode.removeChild(this.node);
        delete this.node;
        return Relation.prototype.detach.call(this);
    }
});

module.exports = HtmlShortcutIcon;
