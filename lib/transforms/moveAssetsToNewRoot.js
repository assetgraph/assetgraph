var URL = require('url'),
    fileUtils = require('../fileUtils'),
    transforms = require('../transforms');

exports.moveAssetsToNewRoot = function (queryObj, newRoot, oldRoot) {
    return function moveAssetsToNewRoot(assetGraph, cb) {
        oldRoot = fileUtils.ensureTrailingSlash(oldRoot || assetGraph.resolver.root);
        if (/^\//.test(newRoot)) {
            newRoot = assetGraph.resolver.root + url.substr(1);
        }
        newRoot = fileUtils.ensureTrailingSlash(newRoot);
        transforms.moveAssets(queryObj, function (asset) {
            return URL.resolve(newRoot, fileUtils.buildRelativeUrl(oldRoot, asset.url));
        })(assetGraph, cb);
    };
};
