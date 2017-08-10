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

    attach(position, adjacentRelation) {
        this.node = this.from.parseTree.createElement('link');
        this.node.setAttribute('rel', 'preload');

        if (this.as) {
            this.node.setAttribute('as', this.as);
        }

        if (this.contentType) {
            this.node.setAttribute('type', this.contentType);
        }

        if (this.as === 'font') {
            this.node.setAttribute('crossorigin', 'crossorigin');
        }

        super.attach(position, adjacentRelation);
        if (this.crossorigin) {
            // fonts should always be treated as crossorigin: https://w3c.github.io/preload/#h-note6
            this.node.setAttribute('crossorigin', 'crossorigin');
        }
    }
};

module.exports = HtmlPreloadLink;
