/**
 *  Abstract class for resource hint relations
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

function HtmlResourceHint(config) {
    if (!config.to || !config.to.url) {
        throw new Error('HtmlResourceHint: The `to` asset must have a url');
    }

    HtmlRelation.call(this, config);
}

util.inherits(HtmlResourceHint, HtmlRelation);

extendWithGettersAndSetters(HtmlResourceHint.prototype, {
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
            throw new Error('relations/HtmlResourceHint: Not a valid type for the as-method: ' + type);
        }

        this._as = type;

        if (this.node) {
            this.node.setAttribute('as', type);
        }
    },

    inline: function () {
        throw new Error('HtmlResourceHint: Inlining of reource hints is not allowed');
    }
});

module.exports = HtmlResourceHint;
