var urlTools = require('../util/urlTools'),
    transforms = require('../transforms');

module.exports = function (queryObj, newRoot, oldRoot) {
    return function moveAssetsToNewRoot(assetGraph, cb) {
        oldRoot = urlTools.ensureTrailingSlash(oldRoot || assetGraph.root);
        if (/^\//.test(newRoot)) {
            newRoot = assetGraph.root + url.substr(1);
        }
        newRoot = urlTools.ensureTrailingSlash(newRoot);
        assetGraph.runTransform(transforms.moveAssets(queryObj, function (asset) {
            return urlTools.resolveUrl(newRoot, urlTools.buildRelativeUrl(oldRoot, asset.url));
        }), cb);
    };
};
