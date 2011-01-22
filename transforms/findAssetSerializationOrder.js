exports.findAssetSerializationOrder = function findAssetSerializationOrder(siteGraph, cb) {
    var assetSerializationOrderGroups = [],
        clone = siteGraph.clone(),
        currentGroup;

    while (clone.assets.length) {
        currentGroup = [];
        [].concat(clone.assets).forEach(function (asset) {
            if (!clone.findRelations('from', asset).length) {
                currentGroup.push(asset);
                clone.unregisterAsset(asset, true); // cascade
            }
        });

        if (currentGroup.length === 0) {
            return cb(new Error("Couldn't find a suitable serialization order, SiteGraph has cycles!"));
        }
        assetSerializationOrderGroups.push(currentGroup);
    }
    cb(null, siteGraph, assetSerializationOrderGroups);
};
