module.exports = function (queryObj, newUrlFunction) {
    return function moveAssets(assetGraph) {
        assetGraph.findAssets(queryObj).forEach(function (asset) {
            var oldUrl = asset.url,
                newUrl = newUrlFunction(asset, assetGraph);
            // Keep the existing file name if the new url ends in a slash:
            if (oldUrl && /\/$/.test(newUrl)) {
                var matchFileName = oldUrl.match(/\/([^\/]+)(?=\?|$)/);
                if (matchFileName) {
                    newUrl += matchFileName[1];
                }
            }
            asset.url = newUrl;
        });
    };
};
