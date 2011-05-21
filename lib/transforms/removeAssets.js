module.exports = function (queryObj, detachIncomingRelations) {
    return function removeAssets(assetGraph, cb) {
        assetGraph.findAssets(queryObj).forEach(function (asset) {
            assetGraph.removeAsset(asset, detachIncomingRelations);
        });
        process.nextTick(cb);
    };
};
