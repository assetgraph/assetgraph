// https://w3c.github.io/ServiceWorker/#link-type-serviceworker

var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    HtmlRelation = require('./HtmlRelation');

function HtmlServiceWorkerRegistration(config) {
    if (!config.to || !config.to.url) {
        throw new Error('HtmlServiceWorkerRegistration: The `to` asset must have a url');
    }

    HtmlRelation.call(this, config);
}

util.inherits(HtmlServiceWorkerRegistration, HtmlRelation);

extendWithGettersAndSetters(HtmlServiceWorkerRegistration.prototype, {
    get href() {
        return this.node.getAttribute('href');
    },

    set href(href) {
        this.node.setAttribute('href', href);
    },

    attach: function (asset, position, adjacentRelation) {
        throw new Error('Not implemented');
    },

    attachToHead: function (asset, position, adjacentNode) {
        this.node = asset.parseTree.createElement('link');
        this.node.setAttribute('rel', 'serviceworker');

        if (this.scope) {
            this.node.setAttribute('scope', this.scope);
        }

        HtmlRelation.prototype.attachToHead.call(this, asset, position, adjacentNode);
    },

    inline: function () {
        throw new Error('HtmlServiceWorkerRegistration: Inlining of service worker relations is not allowed');
    }
});

module.exports = HtmlServiceWorkerRegistration;
