/**
 *  Implementation of http://w3c.github.io/preload/#dfn-preload
 */

var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    HtmlResourceHint = require('./HtmlResourceHint');

function getExtension(url) {
    var matches = url.match(/\.([^$#\?]+)/);

    if (matches && matches[1]) {
        return matches[1];
    }
}

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
        node.setAttribute('crossorigin', 'crossorigin');
    }

    return node;
}

function HtmlPreloadLink(config) {
    HtmlResourceHint.call(this, config);
}

util.inherits(HtmlPreloadLink, HtmlResourceHint);

extendWithGettersAndSetters(HtmlPreloadLink.prototype, {
    get contentType() {
        if ('_contentType' in this) {
            return this._contentType;
        } else {
            if (this.to.contentType) {
                this._contentType = this.to.contentType;
            } else {
                var extension = getExtension(this.to.url);

                var extensionToTypeMap = {
                    'woff': 'application/font-woff', // https://www.w3.org/TR/WOFF/#appendix-b
                    'woff2': 'font/woff2', // https://www.w3.org/TR/WOFF2/#IMT
                    'otf': 'application/font-sfnt', // http://www.iana.org/assignments/media-types/application/font-sfnt
                    'ttf': 'application/font-sfnt', // http://www.iana.org/assignments/media-types/application/font-sfnt
                    'eot': 'application/vnd.ms-fontobject' // https://www.iana.org/assignments/media-types/application/vnd.ms-fontobject
                };

                this._contentType = extensionToTypeMap[extension];
            }

            return this._contentType;
        }
    },

    attach: function (asset, position, adjacentRelation) {
        this.node = getPreloadLinkNode(this, asset);

        this.attachNodeBeforeOrAfter(position, adjacentRelation);
        HtmlResourceHint.prototype.attach.call(this, asset, position, adjacentRelation);

        // checking this.crossorigin requires the relation to already be attached
        if (this.crossorigin) {
            // fonts should always be treated as crossorigin: https://w3c.github.io/preload/#h-note6
            this.node.setAttribute('crossorigin', 'crossorigin');
        }

        return this;
    },

    attachToHead: function (asset, position, adjacentNode) {
        this.node = getPreloadLinkNode(this, asset);

        HtmlResourceHint.prototype.attachToHead.call(this, asset, position, adjacentNode);

        // checking this.crossorigin requires the relation to already be attached
        if (this.crossorigin) {
            // fonts should always be treated as crossorigin: https://w3c.github.io/preload/#h-note6
            this.node.setAttribute('crossorigin', 'crossorigin');
        }
    }
});

module.exports = HtmlPreloadLink;
