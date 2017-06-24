module.exports = queryObj => {
    return function minifyAssets(assetGraph) {
        for (const asset of assetGraph.findAssets(queryObj)) {
            if (asset.minify) {
                asset.minify();
            }
        }
    };
};
