module.exports = function (queryObj) {
    return function removeAssets(err, assetGraph, cb) {
        assetGraph.findAssets(queryObj).forEach(function (asset) {
            assetGraph.removeAsset(asset);
        });
        process.nextTick(cb);
    };
};
