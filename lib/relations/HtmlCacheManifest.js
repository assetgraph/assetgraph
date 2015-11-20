var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation'),
    HtmlRelation = require('./HtmlRelation');

function HtmlCacheManifest(config) {
    HtmlRelation.call(this, config);
}

util.inherits(HtmlCacheManifest, HtmlRelation);

extendWithGettersAndSetters(HtmlCacheManifest.prototype, {
    get href() {
        return this.node.getAttribute('manifest') || undefined;
    },

    set href(href) {
        this.node.setAttribute('manifest', href);
    },

    attach: function (asset, position, adjacentRelation) {
        this.node = asset.parseTree.documentElement; // Always uses <html manifest='...'>
        return HtmlRelation.prototype.attach.call(this, asset, position, adjacentRelation);
    },

    detach: function () {
        this.node.removeAttribute('manifest');
        this.node = undefined;
        return Relation.prototype.detach.call(this);
    }
});

module.exports = HtmlCacheManifest;
