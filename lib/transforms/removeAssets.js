module.exports = function (queryObj, detachIncomingRelations) {
    return function removeAssets(assetGraph) {
        assetGraph.findAssets(queryObj).forEach(function (asset) {
            assetGraph.removeAsset(asset, detachIncomingRelations);
        });
    };
};
