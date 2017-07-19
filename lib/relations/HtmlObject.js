const HtmlRelation = require('./HtmlRelation');

// Requires: config.attributeName
class HtmlObject extends HtmlRelation {
    get href() {
        return this.node.getAttribute(this.attributeName);
    }

    set href(href) {
        this.node.setAttribute(this.attributeName, href);
    }

    attach(asset, position, adjacentRelation) {
        this.node = asset.parseTree.createElement('object');
        this.attachNodeBeforeOrAfter(position, adjacentRelation);
        return super.attach(asset, position, adjacentRelation);
    }
};

module.exports = HtmlObject;
