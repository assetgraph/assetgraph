const HtmlRelation = require('./HtmlRelation');

class HtmlImageSrcSet extends HtmlRelation {
    inline() {
        super.inline();
        this.node.setAttribute('srcset', this.to.text);
        this.from.markDirty();
        return this;
    }

    attach(position, adjacentRelation) {
        this.node = this.from.parseTree.createElement('img');
        return super.attach(position, adjacentRelation);
    }
};

HtmlImageSrcSet.prototype.targetType = 'SrcSet';

module.exports = HtmlImageSrcSet;
