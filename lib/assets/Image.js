var util = require('util'),
    _ = require('underscore'),
    passError = require('../util/passError'),
    Base = require('./Base');

function Image(config) {
    Base.call(this, config);
}

util.inherits(Image, Base);

_.extend(Image.prototype, {
    isImage: true, // assetGraph.findAssets({isImage: true})

    defaultEncoding: null
});

module.exports = Image;
