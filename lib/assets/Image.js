var util = require('util'),
    path = require('path'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Asset = require('./Asset');

var dprMatcher = /(?:@(\d+(?:\.\d+)?)x)?$/;

function Image(config) {
    Asset.call(this, config);
}

util.inherits(Image, Asset);

extendWithGettersAndSetters(Image.prototype, {
    /**
     * image.isImage
     * ===========
     *
     * Property that's true for all Image instances. Avoids reliance on
     * the `instanceof` operator and enables you to query for all
     * image types:
     *
     *     var imageAssets = assetGraph.findAssets({isImage: true});
     */

    contentType: null, // Avoid reregistering application/octet-stream

    defaultEncoding: null,

    get defaultDevicePixelRatio() {
        return 1;
    },

    get devicePixelRatio() {
        if ('_devicePixelRatio' in this) {
            return this._devicePixelRatio;
        } else {
            return this.defaultDevicePixelRatio;
        }
    },

    set devicePixelRatio(ratio) {
        if (isNaN(ratio)) {
            throw new Error('Image device pixel ratio: Must be a number');
        }

        this._devicePixelRatio = ratio;

        this.fileName = this.fileName.replace(this.extension, '').replace(dprMatcher, '@' + ratio + 'x') + this.extension;
    },

    get fileName() {
        if ('_fileName' in this) {
            return this._fileName;
        }
    },

    set fileName(fileName) {
        if (!this.isInline) {
            this.url = this.url.replace(/[^\/?#]*([?#]|$)/, fileName + '$1');
        }
        this._extension = path.extname(fileName);
        this._fileName = fileName;

        var dpr = Number(fileName.replace(this.extension, '').match(dprMatcher)[1]);

        if (!isNaN(dpr)) {
            this._devicePixelRatio = dpr;
        }
    }
});

module.exports = Image;
