/**
 *  Implementation of https://www.w3.org/TR/resource-hints/#dns-prefetch
 */

var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    HtmlRelation = require('./HtmlRelation');

function getLinkNode(relation, htmlAsset) {
    var node = htmlAsset.parseTree.createElement('link');
    node.setAttribute('rel', 'dns-prefetch');

    return node;
}

function HtmlDnsPrefetchLink(config) {
    if (!config.to || !config.to.url) {
        throw new Error('HtmlDnsPrefetchLink: The `to` asset must have a url');
    }

    HtmlRelation.call(this, config);
}

util.inherits(HtmlDnsPrefetchLink, HtmlRelation);

extendWithGettersAndSetters(HtmlDnsPrefetchLink.prototype, {
    get href() {
        return this.node.getAttribute('href');
    },

    set href(href) {
        this.node.setAttribute('href', href);
    },

    attach: function (asset, position, adjacentRelation) {
        this.node = getLinkNode(this, asset);

        this.attachNodeBeforeOrAfter(position, adjacentRelation);
        return HtmlRelation.prototype.attach.call(this, asset, position, adjacentRelation);
    },

    attachToHead: function (asset, position, adjacentNode) {
        this.node = getLinkNode(this, asset);

        HtmlRelation.prototype.attachToHead.call(this, asset, position, adjacentNode);
    },

    inline: function () {
        throw new Error('HtmlDnsPrefetchLink: Inlining of resource hints is not allowed');
    }
});

module.exports = HtmlDnsPrefetchLink;
