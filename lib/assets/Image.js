var util = require('util'),
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
        if (typeof ratio !== 'number' || isNaN(ratio)) {
            throw new Error('Image device pixel ratio: Must be a number');
        }

        if (ratio <= 0) {
            throw new Error('Image device pixel ratio: Must be a larger than 0');
        }

        if (ratio === Infinity) {
            throw new Error('Image device pixel ratio: Cannot be infinite');
        }

        if (!/^[\d,\.]+$/.test(ratio.toString())) {
            throw new Error('Image device pixel ratio: May only contain digits, comma and dot');
        }

        this.fileName = this.fileName.replace(this.extension, '').replace(dprMatcher, '@' + ratio + 'x') + this.extension;
    },

    get fileName() {
        return Asset.prototype.__lookupGetter__('fileName').call(this);
    },

    set fileName(fileName) {
        var dpr = Number(fileName.replace(this.extension, '').match(dprMatcher)[1]);

        if (!isNaN(dpr)) {
            this._devicePixelRatio = dpr;
        }

        Asset.prototype.__lookupSetter__('fileName').call(this, fileName);
    }
});

module.exports = Image;
