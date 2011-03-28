var URL = require('url'),
    fileUtils = require('../fileUtils'),
    transforms = require('../transforms');

module.exports = function (queryObj, newRoot, oldRoot) {
    return function moveAssetsToNewRoot(err, assetGraph, cb) {
        if (err) {
            throw err;
        }
        oldRoot = fileUtils.ensureTrailingSlash(oldRoot || assetGraph.resolver.root);
        if (/^\//.test(newRoot)) {
            newRoot = assetGraph.resolver.root + url.substr(1);
        }
        newRoot = fileUtils.ensureTrailingSlash(newRoot);
        transforms.moveAssets(queryObj, function (asset) {
            return URL.resolve(newRoot, fileUtils.buildRelativeUrl(oldRoot, asset.url));
        })(null, assetGraph, cb);
    };
};
