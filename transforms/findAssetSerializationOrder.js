exports.findAssetSerializationOrder = function findAssetSerializationOrder(siteGraph, cb) {
    var assetSerializationOrder = [],
        clone = siteGraph.clone(),
        numAssetsRemovedThisIteration;

    while (clone.assets.length) {
        numAssetsRemovedThisIteration = 0;
        clone.assets.forEach(function (asset) {
            if (!clone.findRelations('from', asset).length) {
                assetSerializationOrder.push(asset);
                clone.unregisterAsset(asset, true); // cascade
                numAssetsRemovedThisIteration += 1;
            }
        });

        if (numAssetsRemovedThisIteration === 0) {
            return cb(new Error("Couldn't find a suitable serialization order, SiteGraph has cycles!"));
        }
    }
    cb(null, assetSerializationOrder);
};
