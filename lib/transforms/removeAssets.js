module.exports = (queryObj, options) => {
    if (typeof options === 'boolean') {
        options = { detachIncomingRelations: options };
    } else {
        options = options || {};
    }
    return function removeAssets(assetGraph) {
        for (const asset of assetGraph.findAssets(queryObj)) {
            assetGraph.removeAsset(asset, options.detachIncomingRelations);
            if (options.unload) {
                asset.unload();
            }
        }
    };
};
