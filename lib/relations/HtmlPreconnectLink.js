/**
 *  Implementation of https://www.w3.org/TR/resource-hints/#preconnect
 */

var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    HtmlRelation = require('./HtmlRelation');

function getLinkNode(relation, htmlAsset) {
    var node = htmlAsset.parseTree.createElement('link');
    node.setAttribute('rel', 'preconnect');

    return node;
}

function HtmlPreconnectLink(config) {
    if (!config.to || !config.to.url) {
        throw new Error('HtmlPreconnectLink: The `to` asset must have a url');
    }

    HtmlRelation.call(this, config);
}

util.inherits(HtmlPreconnectLink, HtmlRelation);

extendWithGettersAndSetters(HtmlPreconnectLink.prototype, {
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
        throw new Error('HtmlPreconnectLink: Inlining of resource hints is not allowed');
    }
});

module.exports = HtmlPreconnectLink;
