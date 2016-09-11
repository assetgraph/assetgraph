/**
 *  Implementation of http://w3c.github.io/preload/#dfn-preload
 */

var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    HtmlRelation = require('./HtmlRelation');

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
    if (!config.to || !config.to.url) {
        throw new Error('HtmlPreloadLink: The `to` asset must have a url');
    }

    HtmlRelation.call(this, config);
}

util.inherits(HtmlPreloadLink, HtmlRelation);

extendWithGettersAndSetters(HtmlPreloadLink.prototype, {
    get href() {
        return this.node.getAttribute('href');
    },

    set href(href) {
        this.node.setAttribute('href', href);
    },

    // Map Assetgraph relations to request destination (<link as="${destination}">).
    // See https://fetch.spec.whatwg.org/#concept-request-destination
    get requestDestination() {
        if (this.to.isImage) {
            return 'image';
        }

        if (this.to.type === 'JavaScript') {
            return 'script';
        }

        if (this.to.type === 'Css') {
            return 'style';
        }

        if (this.to.incomingRelations) {
            var relType = this.to.incomingRelations[0].type;

            if (['HtmlStyle', 'CssImport'].indexOf(relType) !== -1) {
                return 'style';
            }

            if (this.to.type === 'Html' && (relType === 'HtmlFrame' || relType === 'HtmlIFrame')) {
                return 'document';
            }

            if (relType === 'HtmlAudio') {
                return 'media';
            }

            if (relType === 'HtmlVideo') {
                return 'media';
            }

            if (relType === 'CssFontFaceSrc') {
                return 'font';
            }

            if (relType === 'HtmlEmbed') {
                return 'embed';
            }

            if (relType === 'HtmlObject') {
                return 'object';
            }
        }

        // If the asset hasn't been populated, fall back to best guess based on file extension
        if (this.to.url) {
            var extension = getExtension(this.to.url);

            switch (extension) {
            case 'css':
                return 'style';
            case 'js':
                return 'script';
            case 'svg':
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'gif':
            case 'webp':
            case 'ico':
            case 'tiff':
            case 'bmp':
                return 'image';
            case 'html':
                return 'document';
            case 'woff':
            case 'woff2':
            case 'ttf':
            case 'eot':
            case 'otf':
                return 'font';
            }
        }

        return '';
    },

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

    get as() {
        if (typeof this._as === 'undefined') {
            this._as = this.requestDestination;
        }

        return this._as;
    },

    set as(type) {
        var validRequestDestinations = [
            '',
            'media',
            'script',
            'style',
            'font',
            'image',
            'worker',
            'embed',
            'object',
            'document'
        ];

        if (validRequestDestinations.indexOf(type) === -1) {
            throw new Error('relations/HtmlPreloadLink: Not a valid type for the as-method: ' + type);
        }

        this._as = type;

        if (this.node) {
            this.node.setAttribute('as', type);
        }
    },

    attach: function (asset, position, adjacentRelation) {
        this.node = getPreloadLinkNode(this, asset);

        this.attachNodeBeforeOrAfter(position, adjacentRelation);
        HtmlRelation.prototype.attach.call(this, asset, position, adjacentRelation);

        // checking this.crossorigin requires the relation to already be attached
        if (this.crossorigin) {
            // fonts should always be treated as crossorigin: https://w3c.github.io/preload/#h-note6
            this.node.setAttribute('crossorigin', 'crossorigin');
        }

        return this;
    },

    attachToHead: function (asset, position, adjacentNode) {
        this.node = getPreloadLinkNode(this, asset);

        HtmlRelation.prototype.attachToHead.call(this, asset, position, adjacentNode);

        // checking this.crossorigin requires the relation to already be attached
        if (this.crossorigin) {
            // fonts should always be treated as crossorigin: https://w3c.github.io/preload/#h-note6
            this.node.setAttribute('crossorigin', 'crossorigin');
        }
    },

    inline: function () {
        throw new Error('Not implemented');
    }
});

module.exports = HtmlPreloadLink;
