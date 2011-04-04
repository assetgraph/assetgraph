var URL = require('url'),
    crypto = require('crypto'),
    step = require('step'),
    error = require('../error');

module.exports = function (queryObj, newUrlFunction) {
    return function moveAssets(err, assetGraph, cb) {
        if (err) {
            throw err;
        }
        assetGraph.findAssets(queryObj).forEach(function (asset) {
            var newUrl = newUrlFunction(asset, assetGraph);
            // Keep the existing file name if the new url ends in a slash:
            if (asset.url && /\/$/.test(newUrl)) {
                var matchFileName = asset.url.match(/\/([^\/]+)(?=\?|$)/);
                if (matchFileName) {
                    newUrl += matchFileName[1];
                }
            }
            assetGraph.setAssetUrl(asset, newUrl);
        });
        process.nextTick(cb);
    };
};
