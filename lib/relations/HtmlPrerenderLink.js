/**
 *  Implementation of https://www.w3.org/TR/resource-hints/#prerender
 */

const HtmlRelation = require('./HtmlRelation');

function getPrerenderLinkNode(relation, htmlAsset) {
    const node = htmlAsset.parseTree.createElement('link');
    node.setAttribute('rel', 'prerender');

    return node;
}

class HtmlPrefetchLink extends HtmlRelation {
    constructor(config) {
        super(config);
        if (!this.to || !this.to.url) {
            throw new Error('HtmlPrerenderLink: The `to` asset must have a url');
        }
    }

    get href() {
        return this.node.getAttribute('href');
    }

    set href(href) {
        this.node.setAttribute('href', href);
    }

    attach(asset, position, adjacentRelation) {
        this.node = getPrerenderLinkNode(this, asset);

        this.attachNodeBeforeOrAfter(position, adjacentRelation);
        return super.attach(asset, position, adjacentRelation);
    }

    attachToHead(asset, position, adjacentNode) {
        this.node = getPrerenderLinkNode(this, asset);

        super.attachToHead(asset, position, adjacentNode);
    }

    inline() {
        throw new Error('HtmlPrerenderLink: Inlining of resource hints is not allowed');
    }
};

module.exports = HtmlPrefetchLink;
