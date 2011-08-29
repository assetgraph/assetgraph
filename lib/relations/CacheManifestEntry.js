/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function CacheManifestEntry(config) {
    Relation.call(this, config);
}

util.inherits(CacheManifestEntry, Relation);

extendWithGettersAndSetters(CacheManifestEntry.prototype, {
    get href() {
        return this.node.tokens[this.node.tokens.length - 1];
    },

    set href(href) {
        // In the CACHE section and NETWORK sections there's only one token per entry,
        // in FALLBACK there's the online url followed by the offline url (the one we want).
        // Just overwrite the last token with the url:
        this.node.tokens[this.node.tokens.length - 1] = href;
    },

    attach: function (asset, position, adjacentRelation) {
        this.from = asset;
        if (!this.sectionName) {
            this.sectionName = 'CACHE';
        }
        // FIXME: Doesn't work with FALLBACK entries where there're two tokens.
        this.node = {
            tokens: [this.to.url] // Seems wrong
        };
        if (!(this.sectionName in asset.parseTree)) {
            asset.parseTree[this.sectionName] = [];
        }
        asset.parseTree[this.sectionName].push(this.node);

        Relation.prototype.attach.call(this, asset, position, adjacentRelation);
    },

    detach: function () {
        var indexInSection = this.from.parseTree[this.sectionName].indexOf(this.node);
        if (indexInSection === -1) {
            throw new Error("CacheManifestEntry.detach: Relation not found in the " + this.sectionName + " section");
        }
        this.from.parseTree[this.sectionName].splice(indexInSection, 1);
        Relation.prototype.detach.apply(this, arguments);
    }
});

module.exports = CacheManifestEntry;
