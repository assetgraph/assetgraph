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
        if (position === 'before' || position === 'after') {
            this.attachNodeBeforeOrAfter(position, adjacentRelation);
        } else {
            asset.parseTree.head.appendChild(this.node);
        }
        return super.attach(asset, position, adjacentRelation);
    }
};

module.exports = HtmlContentSecurityPolicy;
