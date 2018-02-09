// Note: Will implicitly un-inline assets found to be identical. If you want to prevent this from happening,
// specify isInline:false or similar in the queryObj.
module.exports = queryObj => {
  return function mergeIdenticalAssets(assetGraph) {
    const seenAssetsByTypeAndMd5 = {};
    for (const asset of assetGraph.findAssets(queryObj)) {
      if (asset.isExternalizable) {
        const md5Hex = asset.md5Hex;
        seenAssetsByTypeAndMd5[asset.type] =
          seenAssetsByTypeAndMd5[asset.type] || {};
        const identicalAsset = seenAssetsByTypeAndMd5[asset.type][md5Hex];
        if (identicalAsset) {
          if (!identicalAsset.url) {
            // Un-inline the identical asset so that the two can be merged:
            identicalAsset.externalize();
          }
          for (const incomingRelation of assetGraph.findRelations({
            to: asset
          })) {
            // Avoid introducing duplicate CacheManifestEntry relations:
            if (
              incomingRelation.type === 'CacheManifestEntry' &&
              assetGraph.findRelations({
                from: incomingRelation.from,
                to: identicalAsset
              }).length > 0
            ) {
              incomingRelation.detach();
            } else {
              incomingRelation.to = identicalAsset;
            }
          }
          assetGraph.removeAsset(asset);
        } else {
          seenAssetsByTypeAndMd5[asset.type][md5Hex] = asset;
        }
      }
    }
  };
};
