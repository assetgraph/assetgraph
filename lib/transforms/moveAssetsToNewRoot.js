var _ = require('underscore'),
    urlTools = require('../util/urlTools'),
    transforms = require('../transforms'),
    query = require('../query');

module.exports = function (queryObj, newRoot, oldRoot) {
    return function moveAssetsToNewRoot(assetGraph, cb) {
        oldRoot = urlTools.ensureTrailingSlash(oldRoot || assetGraph.root);
        if (/^\//.test(newRoot)) {
            newRoot = urlTools.resolveUrl(assetGraph.root, url.substr(1));
        }
        newRoot = urlTools.ensureTrailingSlash(newRoot);
        assetGraph.runTransform(transforms.moveAssets(_.extend({isInline: false}, queryObj), function (asset) {
            return urlTools.resolveUrl(newRoot, urlTools.buildRelativeUrl(oldRoot, asset.url));
        }), cb);
    };
};
