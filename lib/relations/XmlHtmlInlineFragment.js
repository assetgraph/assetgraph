const HtmlRelation = require('./HtmlRelation');

class XmlHtmlInlineFragment extends HtmlRelation {
    inline() {
        super.inline();
        this.node.textContent = this.to.text;
        this.from.markDirty();
        return this;
    }

    attach(asset, position, adjacentRelation) {
        this.node = asset.parseTree.createElement(this.node.nodeName);
        this.attachNodeBeforeOrAfter(this.node, position, adjacentRelation);
        super.attach(asset, position, adjacentRelation);
    }
};

module.exports = XmlHtmlInlineFragment;
