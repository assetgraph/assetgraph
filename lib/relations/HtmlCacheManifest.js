/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Base = require('./Base');

function HtmlCacheManifest(config) {
    Base.call(this, config);
}

util.inherits(HtmlCacheManifest, Base);

extendWithGettersAndSetters(HtmlCacheManifest.prototype, {
    get href() {
        return this.node.getAttribute('manifest') || undefined;
    },

    set href(href) {
        this.node.setAttribute('manifest', href);
    },

    attach: function (asset, position, adjacentRelation) {
        this.from = asset;
        this.node = this.from.parseTree.documentElement; // Always uses <html manifest='...'>
        Base.prototype.attach.apply(this, arguments);
    },

    detach: function () {
        this.node.removeAttribute('manifest');
        delete this.node;
        Base.prototype.detach.call(this);
    }
});

module.exports = HtmlCacheManifest;
