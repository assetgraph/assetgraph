var passError = require('../util/passError');

module.exports = function (queryObj, newUrlFunction) {
    return function moveAssets(assetGraph) {
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
    };
};
