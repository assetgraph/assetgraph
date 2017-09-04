/**
 *  Implementation of http://w3c.github.io/preload/#dfn-preload
 */

var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    HtmlResourceHint = require('./HtmlResourceHint');

function getPreloadLinkNode(relation, htmlAsset) {
    var node = htmlAsset.parseTree.createElement('link');
    node.setAttribute('rel', 'preload');

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

function HtmlPreloadLink(config) {
    HtmlResourceHint.call(this, config);
}

util.inherits(HtmlPreloadLink, HtmlResourceHint);

extendWithGettersAndSetters(HtmlPreloadLink.prototype, {
    attach: function (asset, position, adjacentRelation) {
        this.node = getPreloadLinkNode(this, asset);

        return HtmlResourceHint.prototype.attach.call(this, asset, position, adjacentRelation);
    },

    attachToHead: function (asset, position, adjacentNode) {
        this.node = getPreloadLinkNode(this, asset);

        return HtmlResourceHint.prototype.attachToHead.call(this, asset, position, adjacentNode);
    }
});

module.exports = HtmlPreloadLink;
