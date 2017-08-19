const HtmlRelation = require('./HtmlRelation');

class HtmlContentSecurityPolicy extends HtmlRelation {
    inline() {
        super.inline();
        this.node.setAttribute('content', this.to.text);
        this.from.markDirty();
        return this;
    }

    attach(position, adjacentRelation) {
        this.node = this.from.parseTree.createElement('meta');
        this.node.setAttribute('http-equiv', 'Content-Security-Policy');
        return super.attach(position, adjacentRelation);
    }
};

HtmlContentSecurityPolicy.prototype.targetType = 'ContentSecurityPolicy';

module.exports = HtmlContentSecurityPolicy;
