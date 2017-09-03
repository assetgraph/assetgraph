/**
 *  Implementation of https://www.w3.org/TR/resource-hints/#prefetch
 */

var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    HtmlResourceHint = require('./HtmlResourceHint');

function getPrefetchLinkNode(relation, htmlAsset) {
    var node = htmlAsset.parseTree.createElement('link');
    node.setAttribute('rel', 'prefetch');

    if (relation.as) {
        node.setAttribute('as', relation.as);
    }

    if (relation.contentType) {
        node.setAttribute('type', relation.contentType);
    }

    if (relation.as === 'font') {
        node.setAttribute('crossorigin', 'anonymous');
    }

    return node;
}

function HtmlPrefetchLink(config) {
    HtmlResourceHint.call(this, config);
}

util.inherits(HtmlPrefetchLink, HtmlResourceHint);

extendWithGettersAndSetters(HtmlPrefetchLink.prototype, {
    attach: function (asset, position, adjacentRelation) {
        this.node = getPrefetchLinkNode(this, asset);

        return HtmlResourceHint.prototype.attach.call(this, asset, position, adjacentRelation);
    },

    attachToHead: function (asset, position, adjacentNode) {
        this.node = getPrefetchLinkNode(this, asset);

        return HtmlResourceHint.prototype.attachToHead.call(this, asset, position, adjacentNode);
    }
});

module.exports = HtmlPrefetchLink;
