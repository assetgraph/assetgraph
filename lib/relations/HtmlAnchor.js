const HtmlRelation = require('./HtmlRelation');

class HtmlAnchor extends HtmlRelation {
    get href() {
        return this.node.getAttribute('href');
    }

    set href(href) {
        this.node.setAttribute('href', href);
    }

    attach(asset, position, adjacentRelation) {
        this.node = asset.parseTree.createElement('a');
        this.attachNodeBeforeOrAfter(position, adjacentRelation);
        return super.attach(asset, position, adjacentRelation);
    }
};

module.exports = HtmlAnchor;
