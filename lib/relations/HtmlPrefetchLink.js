/**
 *  Implementation of https://www.w3.org/TR/resource-hints/#prefetch
 */

const HtmlResourceHint = require('./HtmlResourceHint');

function getPrefetchLinkNode(relation, htmlAsset) {
    var node = htmlAsset.parseTree.createElement('link');
    node.setAttribute('rel', 'prefetch');

    if (relation.as) {
        node.setAttribute('as', relation.as);
    }

    return node;
}

class HtmlPrefetchLink extends HtmlResourceHint {
    attach(asset, position, adjacentRelation) {
        this.node = getPrefetchLinkNode(this, asset);

        this.attachNodeBeforeOrAfter(position, adjacentRelation);
        return super.attach(asset, position, adjacentRelation);
    }

    attachToHead(asset, position, adjacentNode) {
        this.node = getPrefetchLinkNode(this, asset);

        super.attachToHead(asset, position, adjacentNode);
    }
};

module.exports = HtmlPrefetchLink;
