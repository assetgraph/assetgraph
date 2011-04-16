module.exports = function (queryObj, detachIncoming) {
    return function removeAssets(err, assetGraph, cb) {
        assetGraph.findAssets(queryObj).forEach(function (asset) {
            assetGraph.findRelations({to: asset}).forEach(function (incomingRelation) {
                if (detachIncoming) {
                    assetGraph.detachAndRemoveRelation(incomingRelation);
                } else {
                    assetGraph.removeRelation(incomingRelation);
                }
            });
            assetGraph.removeAsset(asset);
        });
        process.nextTick(cb);
    };
};
