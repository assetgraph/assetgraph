const AssetGraph = require('../AssetGraph');

module.exports = (queryObj) => {
  return function checkIncompatibleTypes(assetGraph) {
    for (const asset of assetGraph.findAssets(queryObj)) {
      assetGraph.checkIncompatibleTypesForAsset(asset);
    }
  };
};
