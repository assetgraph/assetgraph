var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Asset = require('./Asset');

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

    defaultEncoding: null
});

module.exports = Image;
