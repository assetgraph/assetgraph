var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Base = require('./Base');

function Image(config) {
    Base.call(this, config);
}

util.inherits(Image, Base);

extendWithGettersAndSetters(Image.prototype, {
    isImage: true, // assetGraph.findAssets({isImage: true})

    defaultEncoding: null
});

module.exports = Image;
