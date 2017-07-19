const HtmlRelation = require('./HtmlRelation');

class HtmlInlineFragment extends HtmlRelation {
    inline() {
        super.inline();
        this.node.innerHTML = this.to.text;
        this.from.markDirty();
        return this;
    }

    attach(asset, position, adjacentRelation) {
        this.node = asset.parseTree.createElement(this.node.nodeName);
        this.attachNodeBeforeOrAfter(this.node, position, adjacentRelation);

        return super.attach(asset, position, adjacentRelation);
    }
};

module.exports = HtmlInlineFragment;
