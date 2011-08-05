module.exports = function (queryObj) {
    return function prettyPrintAssets(assetGraph) {
        assetGraph.findAssets(queryObj).forEach(function (asset) {
            if (asset.prettyPrint) {
                asset.prettyPrint();
            }
        });
    };
};
