/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function HtmlCacheManifest(config) {
    Relation.call(this, config);
}

util.inherits(HtmlCacheManifest, Relation);

extendWithGettersAndSetters(HtmlCacheManifest.prototype, {
    get href() {
        return this.node.getAttribute('manifest') || undefined;
    },

    set href(href) {
        this.node.setAttribute('manifest', href);
    },

    inline: function () {
        Relation.prototype.inline.call(this);
        this.href = "data:" + this.to.contentType + ";base64," + this.to.rawSrc.toString('base64');
        this.from.markDirty();
        return this;
    },

    attach: function (asset, position, adjacentRelation) {
        this.from = asset;
        this.node = this.from.parseTree.documentElement; // Always uses <html manifest='...'>
        return Relation.prototype.attach.call(this, asset, position, adjacentRelation);
    },

    detach: function () {
        this.node.removeAttribute('manifest');
        delete this.node;
        return Relation.prototype.detach.call(this);
    }
});

module.exports = HtmlCacheManifest;
