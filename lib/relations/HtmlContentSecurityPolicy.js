const HtmlRelation = require('./HtmlRelation');

class HtmlContentSecurityPolicy extends HtmlRelation {
    inline() {
        super.inline();
        this.node.setAttribute('content', this.to.text);
        this.from.markDirty();
        return this;
    }

    attach(asset, position, adjacentRelation) {
        this.node = asset.parseTree.createElement('meta');
        this.node.setAttribute('http-equiv', 'Content-Security-Policy');
        return super.attach(asset, position, adjacentRelation);
    }
};

module.exports = HtmlContentSecurityPolicy;
