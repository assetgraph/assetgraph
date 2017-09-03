/**
 *  Implementation of https://www.w3.org/TR/resource-hints/#preconnect
 */

var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    HtmlResourceHint = require('./HtmlResourceHint');

function getLinkNode(relation, htmlAsset) {
    var node = htmlAsset.parseTree.createElement('link');
    node.setAttribute('rel', 'preconnect');

    return node;
}

function HtmlPreconnectLink(config) {
    if (!config.to || !config.to.url) {
        throw new Error('HtmlPreconnectLink: The `to` asset must have a url');
    }

    HtmlResourceHint.call(this, config);
}

util.inherits(HtmlPreconnectLink, HtmlResourceHint);

extendWithGettersAndSetters(HtmlPreconnectLink.prototype, {
    attach: function (asset, position, adjacentRelation) {
        this.node = getLinkNode(this, asset);

        return HtmlResourceHint.prototype.attach.call(this, asset, position, adjacentRelation);
    },

    attachToHead: function (asset, position, adjacentNode) {
        this.node = getLinkNode(this, asset);

        return HtmlResourceHint.prototype.attachToHead.call(this, asset, position, adjacentNode);
    }
});

module.exports = HtmlPreconnectLink;
