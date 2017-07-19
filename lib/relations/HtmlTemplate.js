const HtmlRelation = require('./HtmlRelation');

class HtmlTemplate extends HtmlRelation {
    inline() {
        super.inline();
        this.node.innerHTML = this.to.text;
        this.from.markDirty();
        return this;
    }

    attach(asset, position, adjacentRelation) {
        this.node = asset.parseTree.createElement('template');
        this.attachNodeBeforeOrAfter(position, adjacentRelation);

        return super.attach(asset, position, adjacentRelation);
    }
};

module.exports = HtmlTemplate;
