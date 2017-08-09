const HtmlRelation = require('./HtmlRelation');

class HtmlImageSrcSet extends HtmlRelation {
    inline() {
        super.inline();
        this.node.setAttribute('srcset', this.to.text);
        this.from.markDirty();
        return this;
    }

    attach(asset, position, adjacentRelation) {
        this.node = asset.parseTree.createElement('img');
        return super.attach(asset, position, adjacentRelation);
    }
};

module.exports = HtmlImageSrcSet;
