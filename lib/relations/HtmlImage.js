const HtmlRelation = require('./HtmlRelation');

class HtmlImage extends HtmlRelation {
    get href() {
        return this.node.getAttribute('src');
    }

    set href(href) {
        this.node.setAttribute('src', href);
    }

    attach(asset, position, adjacentRelation) {
        this.node = asset.parseTree.createElement('img');
        this.attachNodeBeforeOrAfter(position, adjacentRelation);
        return super.attach(asset, position, adjacentRelation);
    }
};

module.exports = HtmlImage;
