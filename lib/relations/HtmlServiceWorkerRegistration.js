// https://w3c.github.io/ServiceWorker/#link-type-serviceworker

const HtmlRelation = require('./HtmlRelation');

class HtmlServiceWorkerRegistration extends HtmlRelation {
    constructor(config) {
        super(config);

        if (!this.to || !this.to.url) {
            throw new Error('HtmlServiceWorkerRegistration: The `to` asset must have a url');
        }
    }

    get href() {
        return this.node.getAttribute('href');
    }

    set href(href) {
        this.node.setAttribute('href', href);
    }

    attach(asset, position, adjacentRelation) {
        throw new Error('Not implemented');
    }

    attachToHead(asset, position, adjacentNode) {
        this.node = asset.parseTree.createElement('link');
        this.node.setAttribute('rel', 'serviceworker');

        if (this.scope) {
            this.node.setAttribute('scope', this.scope);
        }

        super.attachToHead(asset, position, adjacentNode);
    }

    inline() {
        throw new Error('HtmlServiceWorkerRegistration: Inlining of service worker relations is not allowed');
    }
};

module.exports = HtmlServiceWorkerRegistration;
