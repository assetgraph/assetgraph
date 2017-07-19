const HtmlRelation = require('./HtmlRelation');

function getNode(relation, htmlAsset) {
    var node = htmlAsset.parseTree.createElement('meta');
    node.setAttribute('name', 'msapplication-config');

    return node;
}

class HtmlMsApplicationConfig extends HtmlRelation {
    get href() {
        return this.node.getAttribute('content');
    }

    set href(href) {
        this.node.setAttribute('content', href);
    }

    attach(asset, position, adjacentRelation) {
        this.node = getNode(this, asset);
        this.attachNodeBeforeOrAfter(position, adjacentRelation);
        return super.attach(asset, position, adjacentRelation);
    }

    attachToHead(asset, position, adjacentNode) {
        this.node = getNode(this, asset);
        return super.attachToHead(asset, position, adjacentNode);
    }
};

module.exports = HtmlMsApplicationConfig;
