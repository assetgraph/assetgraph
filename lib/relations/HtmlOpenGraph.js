var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    HtmlRelation = require('./HtmlRelation');

function HtmlOpenGraph(config) {
    if (!config.to || !config.to.url) {
        throw new Error('HtmlOpenGraph: The `to` asset must have a url');
    }

    HtmlRelation.call(this, config);
}

util.inherits(HtmlOpenGraph, HtmlRelation);

extendWithGettersAndSetters(HtmlOpenGraph.prototype, {
    get href() {
        return this.node.getAttribute('content');
    },

    set href(href) {
        this.node.setAttribute('content', href);
    },

    attach: function (asset, position, adjacentRelation) {
        throw new Error('Not implemented');
    },

    attachToHead: function (asset, position, adjacentNode) {
        this.node = asset.parseTree.createElement('meta');
        this.node.setAttribute('property', this.ogProperty);

        HtmlRelation.prototype.attachToHead.call(this, asset, position, adjacentNode);
    },

    inline: function () {
        throw new Error('HtmlOpenGraph: Inlining of open graph relations is not allowed');
    }
});

module.exports = HtmlOpenGraph;
