var URL = require('url');

exports.moveAssetsToCDN = function (queryObj, cdnRoot) {
    return function moveAssetsToCDN(assetGraph, cb) {
        assetGraph.findAssets(queryObj).forEach(function (asset) {
            assetGraph.setAssetUrl(asset, URL.resolve(cdnRoot, fileUtils.buildRelativeUrl(assetGraph.root, asset.url)));
        });
        process.nextTick(cb);
    };
};
