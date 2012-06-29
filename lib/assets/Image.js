var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Asset = require('./Asset'),
    histogram;

try {
    // histogram is an optional dependency because of missing canvas support on windows right now
    histogram = require('histogram');
} catch (err) {}

function Image(config) {
    Asset.call(this, config);
}

util.inherits(Image, Asset);

extendWithGettersAndSetters(Image.prototype, {
    /**
     * image.isImage
     * ===========
     *
     * Property that's true for all Text instances. Avoids reliance on
     * the `instanceof` operator and enables you to query for all
     * image types:
     *
     *     var imageAssets = assetGraph.findAssets({isImage: true});
     */

    contentType: null, // Avoid reregistering application/octet-stream

    defaultEncoding: null,

    getHistogram: function (cb) {
        if (!histogram) {
            return cb(new Error('histogram is not installed'));
        }

        histogram(this.rawSrc, cb);
    }
});

module.exports = Image;
