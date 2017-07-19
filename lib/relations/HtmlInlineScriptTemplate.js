const HtmlRelation = require('./HtmlRelation');

class HtmlInlineScriptTemplate extends HtmlRelation {
    inline() {
        super.inline();
        this.node.textContent = this.to.text;
        this.from.markDirty();
        return this;
    }

    attach(asset, position, adjacentRelation) {
        this.node = asset.parseTree.createElement('script');
        this.node.setAttribute('type', this.to.contentType);
        this.attachNodeBeforeOrAfter(position, adjacentRelation);

        return super.attach(asset, position, adjacentRelation);
    }
};

module.exports = HtmlInlineScriptTemplate;
