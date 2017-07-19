/**
 *  Implementation of http://w3c.github.io/preload/#dfn-preload
 */

const HtmlResourceHint = require('./HtmlResourceHint');

function getExtension(url) {
    const matches = url.match(/\.([^$#\?]+)/);

    if (matches && matches[1]) {
        return matches[1];
    }
}

const extensionToTypeMap = {
    woff: 'application/font-woff', // https://www.w3.org/TR/WOFF/#appendix-b
    woff2: 'font/woff2', // https://www.w3.org/TR/WOFF2/#IMT
    otf: 'application/font-sfnt', // http://www.iana.org/assignments/media-types/application/font-sfnt
    ttf: 'application/font-sfnt', // http://www.iana.org/assignments/media-types/application/font-sfnt
    eot: 'application/vnd.ms-fontobject' // https://www.iana.org/assignments/media-types/application/vnd.ms-fontobject
};

function getPreloadLinkNode(relation, htmlAsset) {
    const node = htmlAsset.parseTree.createElement('link');
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

class HtmlPreloadLink extends HtmlResourceHint {
    get contentType() {
        if ('_contentType' in this) {
            return this._contentType;
        } else {
            if (this.to.contentType) {
                this._contentType = this.to.contentType;
            } else {
                const extension = getExtension(this.to.url);
                this._contentType = extensionToTypeMap[extension];
            }

            return this._contentType;
        }
    }

    attach(asset, position, adjacentRelation) {
        this.node = getPreloadLinkNode(this, asset);

        this.attachNodeBeforeOrAfter(position, adjacentRelation);
        super.attach(asset, position, adjacentRelation);

        // checking this.crossorigin requires the relation to already be attached
        if (this.crossorigin) {
            // fonts should always be treated as crossorigin: https://w3c.github.io/preload/#h-note6
            this.node.setAttribute('crossorigin', 'crossorigin');
        }

        return this;
    }

    attachToHead(asset, position, adjacentNode) {
        this.node = getPreloadLinkNode(this, asset);

        super.attachToHead(asset, position, adjacentNode);

        // checking this.crossorigin requires the relation to already be attached
        if (this.crossorigin) {
            // fonts should always be treated as crossorigin: https://w3c.github.io/preload/#h-note6
            this.node.setAttribute('crossorigin', 'crossorigin');
        }
    }
};

module.exports = HtmlPreloadLink;
