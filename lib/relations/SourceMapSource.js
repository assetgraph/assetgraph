const Relation = require('./Relation');

class SourceMapSource extends Relation {
    set href(href) {
        this.from.parseTree.sources[this.index] = href;
    }

    get href() {
        return this.from.parseTree.sources[this.index];
    }

    get baseUrl() {
        // Duplicated from Relation.prototype.baseUrl getter:
        const baseAsset = this.baseAsset;
        let baseUrl;
        if (baseAsset) {
            baseUrl = baseAsset.nonInlineAncestor.url;
        } else if (this.hrefType !== 'relative') {
            const fromNonInlineAncestor = this.from.nonInlineAncestor;
            if (fromNonInlineAncestor) {
                baseUrl = fromNonInlineAncestor.url;
            }
        }
        const sourceRoot = this.from.parseTree.sourceRoot;
        if (sourceRoot) {
            baseUrl = this.from.assetGraph.resolveUrl(baseUrl, sourceRoot.replace(/\/?$/, '/')); // Ensure trailing slash
        }
        return baseUrl;
    }

    inline() {
        super.inline();
        this.href = this.to.dataUrl;
        return this;
    }

    attach(asset, position, adjacentRelation) {
        asset.parseTree.sources = asset.parseTree.sources || [];
        this.index = asset.parseTree.sources.length;
        asset.parseTree.sources[this.index] = '<urlGoesHere>';
        return super.attach(asset, position, adjacentRelation);
    }

    detach() {
        this.from.parseTree.sources[this.index] = null; // So that the indices of sibling SourceMapSource relations don't break
        return super.detach();
    }
};

module.exports = SourceMapSource;
