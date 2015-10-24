var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Asset = require('./Asset');

var dprMatcher = /(?:@(\d+(?:[\.,]\d+)?)x)?$/;

function Image(config) {
    Asset.call(this, config);

    if (this._fileName) {
        var dpr = this._fileName.replace(this._extension, '').match(dprMatcher)[1];

        if (dpr) {
            this.devicePixelRatio = dpr;
        }
    }
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

    notDefaultForContentType: true, // Avoid reregistering application/octet-stream

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
        if (!/^\d+(?:[\.,]\d+)?$/.test(ratio.toString())) {
            throw new Error('Image device pixel ratio: May only contain digits, comma and dot');
        }

        ratio = Number(ratio.toString().replace(',', '.'));

        if (ratio <= 0) {
            throw new Error('Image device pixel ratio: Must be a larger than 0');
        }

        if (ratio === Infinity) {
            throw new Error('Image device pixel ratio: Cannot be infinite');
        }

        this._devicePixelRatio = ratio;
    },

    get fileName() {
        return Asset.prototype.__lookupGetter__('fileName').call(this);
    },

    set fileName(fileName) {
        var dpr = fileName.replace(this._extension, '').match(dprMatcher)[1];

        if (dpr) {
            this.devicePixelRatio = dpr;
        }

        Asset.prototype.__lookupSetter__('fileName').call(this, fileName);
    },

    get url() {
        return Asset.prototype.__lookupGetter__('url').call(this);
    },

    set url(url) {
        Asset.prototype.__lookupSetter__('url').call(this, url);

        var dpr = this._fileName.replace(this._extension, '').match(dprMatcher)[1];

        if (dpr) {
            this.devicePixelRatio = dpr;
        }
    }
});

module.exports = Image;
