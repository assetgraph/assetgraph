module.exports = function (queryObj) {
    return function minifyAssets(assetGraph) {
        assetGraph.findAssets(queryObj).forEach(function (asset) {
            if (asset.minify) {
                asset.minify();
            }
        });
    };
};
