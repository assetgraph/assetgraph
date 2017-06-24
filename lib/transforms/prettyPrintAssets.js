module.exports = queryObj => {
    return function prettyPrintAssets(assetGraph) {
        for (const asset of assetGraph.findAssets(queryObj)) {
            if (asset.prettyPrint) {
                asset.prettyPrint();
            }
        }
    };
};
