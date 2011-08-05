module.exports = function (queryObj) {
    return function removeEmptyAssets(assetGraph) {
        assetGraph.findAssets(queryObj).forEach(function (asset) {
            // Check if the asset has an isEmpty method:
            if (asset.isEmpty && asset.isEmpty()) {
                assetGraph.removeAsset(asset, true); // detachIncomingRelations
            }
        });
    };
};
