var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Asset = require('./Asset');

function Image(config) {
    Asset.call(this, config);
}

util.inherits(Image, Asset);

extendWithGettersAndSetters(Image.prototype, {
    isImage: true, // assetGraph.findAssets({isImage: true})

    contentType: null, // Avoid reregistering application/octet-stream

    defaultEncoding: null
});

module.exports = Image;
