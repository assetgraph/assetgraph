const HtmlRelation = require('./HtmlRelation');

class HtmlMsApplicationTileImageMeta extends HtmlRelation {
    get href() {
        return this.node.getAttribute('content');
    }

    set href(href) {
        this.node.setAttribute('content', href);
    }

    attach(asset, position, adjacentRelation) {
        this.node = asset.parseTree.createElement('meta');
        this.node.setAttribute('name', 'msapplication-TileImage');
        this.attachNodeBeforeOrAfter(position, adjacentRelation);
        return super.attach(asset, position, adjacentRelation);
    }
};

module.exports = HtmlMsApplicationTileImageMeta;
