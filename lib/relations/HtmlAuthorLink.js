const HtmlRelation = require('./HtmlRelation');

class HtmlAuthorLink extends HtmlRelation {
    get href() {
        return this.node.getAttribute('href');
    }

    set href(href) {
        this.node.setAttribute('href', href);
    }

    attach(asset, position, adjacentRelation) {
        this.node = asset.parseTree.createElement('link');
        this.node.setAttribute('rel', 'author');
        this.node.setAttribute('type', this.to.contentType);
        this.attachNodeBeforeOrAfter(position, adjacentRelation);
        return super.attach(asset, position, adjacentRelation);
    }
};

module.exports = HtmlAuthorLink;
