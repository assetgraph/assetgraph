const HtmlRelation = require('./HtmlRelation');

class HtmlEmbed extends HtmlRelation {
    get href() {
        return this.node.getAttribute('src');
    }

    set href(href) {
        this.node.setAttribute('src', href);
    }

    attach(asset, position, adjacentRelation) {
        this.node = asset.parseTree.createElement('embed');
        return super.attach(asset, position, adjacentRelation);
    }
};

module.exports = HtmlEmbed;
