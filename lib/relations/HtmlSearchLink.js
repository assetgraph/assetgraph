const HtmlRelation = require('./HtmlRelation');

class HtmlSearchLink extends HtmlRelation {
    get href() {
        return this.node.getAttribute('href');
    }

    set href(href) {
        this.node.setAttribute('href', href);
    }

    attach(asset, position, adjacentRelation) {
        this.node = asset.parseTree.createElement('link');
        this.node.setAttribute('rel', 'search');
        this.node.setAttribute('type', this.to.contentType);
        this.attachNodeBeforeOrAfter(position, adjacentRelation);
        return super.attach(asset, position, adjacentRelation);
    }
};

module.exports = HtmlSearchLink;
