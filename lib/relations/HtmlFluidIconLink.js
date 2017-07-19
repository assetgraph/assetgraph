const HtmlRelation = require('./HtmlRelation');

class HtmlFluidIconLink extends HtmlRelation {
    get href() {
        return this.node.getAttribute('href');
    }

    set href(href) {
        this.node.setAttribute('href', href);
    }

    attach(asset, position, adjacentRelation) {
        this.node = asset.parseTree.createElement('link');
        this.node.setAttribute('rel', 'fluid-icon');
        this.attachNodeBeforeOrAfter(position, adjacentRelation);
        return super.attach(asset, position, adjacentRelation);
    }
};

module.exports = HtmlFluidIconLink;
