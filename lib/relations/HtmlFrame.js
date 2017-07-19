const HtmlRelation = require('./HtmlRelation');

class HtmlFrame extends HtmlRelation {
    get href() {
        return this.node.getAttribute('src');
    }

    set href(href) {
        this.node.setAttribute('src', href);
    }

    attach(asset, position, adjacentRelation) {
        this.node = asset.parseTree.createElement('frame');
        this.attachNodeBeforeOrAfter(this.node, position, adjacentRelation);
        return super.attach(asset, position, adjacentRelation);
    }
};

module.exports = HtmlFrame;
