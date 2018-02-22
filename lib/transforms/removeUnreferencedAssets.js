module.exports = queryObj => {
  return function removeUnreferencedAssets(assetGraph) {
    const assets = assetGraph.findAssets(
      Object.assign({ isInline: false }, queryObj)
    );
    let numRemoved;
    do {
      numRemoved = 0;
      for (let i = 0; i < assets.length; i += 1) {
        const asset = assets[i];
        if (assetGraph.findRelations({ to: asset }).length === 0) {
          assetGraph.removeAsset(asset);
          assets.splice(i, 1);
          i -= 1;
          numRemoved += 1;
        }
      }
    } while (numRemoved > 0);
  };
};
