const HtmlRelation = require('./HtmlRelation');

class HtmlPictureSourceSrcSet extends HtmlRelation {
    inline() {
        super.inline();
        this.node.setAttribute('srcset', this.to.text);
        this.from.markDirty();
        return this;
    }

    attach(position, adjacentRelation) {
        this.node = this.from.parseTree.createElement('source');
        return super.attach(position, adjacentRelation);
    }
};

module.exports = HtmlPictureSourceSrcSet;
