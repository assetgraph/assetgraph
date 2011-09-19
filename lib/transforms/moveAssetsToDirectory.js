var _ = require('underscore'),
    urlTools = require('../util/urlTools'),
    transforms = require('../transforms');

module.exports = function (queryObj, url) {
    return function moveAssetsToDirectory(assetGraph, cb) {
        if (/^\//.test(url)) {
            url = urlTools.resolveUrl(assetGraph.root, url.substr(1));
        }
        if (!/\/$/.test(url)) {
            url += '/';
        }
        assetGraph.runTransform(transforms.moveAssets(_.extend({isInline: false}, queryObj), function (asset) {
            return url + asset.id + asset.extension;
        }), cb);
    };
};
