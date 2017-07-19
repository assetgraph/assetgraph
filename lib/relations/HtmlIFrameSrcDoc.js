const HtmlRelation = require('./HtmlRelation');

class HtmlIFrameSrcDoc extends HtmlRelation {
    inline() {
        super.inline();
        this.node.setAttribute('srcdoc', this.to.text);
        this.from.markDirty();
        return this;
    }

    attach(asset, position, adjacentRelation) {
        this.node = asset.parseTree.createElement('iframe');
        this.attachNodeBeforeOrAfter(position, adjacentRelation);
        return super.attach(asset, position, adjacentRelation);
    }
};

module.exports = HtmlIFrameSrcDoc;
