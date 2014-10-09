module.exports = function (queryObj, options) {
    if (typeof options === 'boolean') {
        options = {detachIncomingRelations: options};
    } else {
        options = options || {};
    }
    return function removeAssets(assetGraph) {
        assetGraph.findAssets(queryObj).forEach(function (asset) {
            assetGraph.removeAsset(asset, options.detachIncomingRelations);
            if (options.unload) {
                asset.unload();
            }
        });
    };
};
