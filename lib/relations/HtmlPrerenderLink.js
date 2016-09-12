/**
 *  Implementation of https://www.w3.org/TR/resource-hints/#prerender
 */

var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    HtmlRelation = require('./HtmlRelation');

function getPrerenderLinkNode(relation, htmlAsset) {
    var node = htmlAsset.parseTree.createElement('link');
    node.setAttribute('rel', 'prerender');

    return node;
}

function HtmlPrefetchLink(config) {
    if (!config.to || !config.to.url) {
        throw new Error('HtmlPrerenderLink: The `to` asset must have a url');
    }

    HtmlRelation.call(this, config);
}

util.inherits(HtmlPrefetchLink, HtmlRelation);

extendWithGettersAndSetters(HtmlPrefetchLink.prototype, {
    get href() {
        return this.node.getAttribute('href');
    },

    set href(href) {
        this.node.setAttribute('href', href);
    },

    attach: function (asset, position, adjacentRelation) {
        this.node = getPrerenderLinkNode(this, asset);

        this.attachNodeBeforeOrAfter(position, adjacentRelation);
        return HtmlRelation.prototype.attach.call(this, asset, position, adjacentRelation);
    },

    attachToHead: function (asset, position, adjacentNode) {
        this.node = getPrerenderLinkNode(this, asset);

        HtmlRelation.prototype.attachToHead.call(this, asset, position, adjacentNode);
    },

    inline: function () {
        throw new Error('HtmlPrerenderLink: Inlining of resource hints is not allowed');
    }
});

module.exports = HtmlPrefetchLink;
