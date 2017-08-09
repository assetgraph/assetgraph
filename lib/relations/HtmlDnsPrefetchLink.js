/**
 *  Implementation of https://www.w3.org/TR/resource-hints/#dns-prefetch
 */

const HtmlRelation = require('./HtmlRelation');

class HtmlDnsPrefetchLink extends HtmlRelation {
    constructor(config) {
        super(config);
        if (!this.to || !this.to.url) {
            throw new Error('HtmlDnsPrefetchLink: The `to` asset must have a url');
        }
    }

    get href() {
        return this.node.getAttribute('href');
    }

    set href(href) {
        this.node.setAttribute('href', href);
    }

    attach(asset, position, adjacentRelation) {
        this.node = this.from.parseTree.createElement('link');
        this.node.setAttribute('rel', 'dns-prefetch');

        return super.attach(asset, position, adjacentRelation);
    }

    inline() {
        throw new Error('HtmlDnsPrefetchLink: Inlining of resource hints is not allowed');
    }
};

module.exports = HtmlDnsPrefetchLink;
