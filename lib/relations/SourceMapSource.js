var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function SourceMapSource(config) {
    Relation.call(this, config);
}

util.inherits(SourceMapSource, Relation);

extendWithGettersAndSetters(SourceMapSource.prototype, {
    set href(href) {
        this.from.parseTree.sources[this.index] = href;
    },

    get href() {
        return this.from.parseTree.sources[this.index];
    },

    get baseUrl() {
        // Duplicated from Relation.prototype.baseUrl getter:
        var baseAsset = this.baseAsset,
            baseUrl;
        if (baseAsset) {
            baseUrl = baseAsset.nonInlineAncestor.url;
        } else if (this.hrefType !== 'relative') {
            var fromNonInlineAncestor = this.from.nonInlineAncestor;
            if (fromNonInlineAncestor) {
                baseUrl = fromNonInlineAncestor.url;
            }
        }
        var sourceRoot = this.from.parseTree.sourceRoot;
        if (sourceRoot) {
            baseUrl = this.from.assetGraph.resolveUrl(baseUrl, sourceRoot.replace(/\/?$/, '/')); // Ensure trailing slash
        }
        return baseUrl;
    },

    inline: function () {
        Relation.prototype.inline.call(this);
        this.href = 'data:' + this.to.contentType + ';base64,' + this.to.rawSrc.toString('base64');
    },

    attach: function (asset, position, adjacentRelation) {
        asset.parseTree.sources = asset.parseTree.sources || [];
        this.index = asset.parseTree.sources.length;
        asset.parseTree.sources[this.index] = '<urlGoesHere>';
        return Relation.prototype.attach.call(this, asset, position, adjacentRelation);
    },

    detach: function () {
        this.from.parseTree.sources[this.index] = null; // So that the indices of sibling SourceMapSource relations don't break
        return Relation.prototype.detach.call(this);
    }
});

module.exports = SourceMapSource;
