const compileQuery = require('../compileQuery');
const createAssetMover = require('../util/assetMover');

// Helper function for determining the order in which the hashes can be computed and the assets
// moved. The challenge lies in the fact that updating a relation to point at <hash>.<extension>
// will change the hash of the asset that owns the relation.
// Needless to say this will fail if the graph of assets to be moved has cycles, so be careful.
function findAssetMoveOrderBatches(assetGraph, queryObj) {
  const batches = [];
  const outgoingRelationsByAssetId = {};
  const assetMatcher = compileQuery(queryObj);

  for (const asset of assetGraph.findAssets({ isInline: false })) {
    if (assetMatcher(asset)) {
      const relationFrom = assetGraph.collectAssetsPostOrder(asset, {
        to: { isInline: true }
      });
      const relationTo = { isInline: false };
      // Filter source map file relation to prevent possible recursion
      outgoingRelationsByAssetId[asset.id] = assetGraph
        .findRelations({
          from: { id: { $in: relationFrom.map(relation => relation.id) } },
          to: relationTo,
          type: { $not: 'SourceMapFile' }
        })
        .filter(relation => relation.to !== asset);
    }
  }

  while (true) {
    const remainingAssetIds = Object.keys(outgoingRelationsByAssetId);
    if (remainingAssetIds.length === 0) {
      break;
    }
    const currentBatch = [];
    for (const assetId of remainingAssetIds) {
      if (
        !outgoingRelationsByAssetId[assetId].some(
          outgoingRelation => outgoingRelationsByAssetId[outgoingRelation.to.id]
        )
      ) {
        currentBatch.push(assetGraph.idIndex[assetId]);
      }
    }

    for (const asset of currentBatch) {
      delete outgoingRelationsByAssetId[asset.id];
    }

    if (currentBatch.length === 0) {
      throw new Error(
        "transforms.moveAssetsInOrder: Couldn't find a suitable rename order due to cycles in the selection"
      );
    }
    batches.push(currentBatch);
  }
  return batches;
}

module.exports = (queryObj, newUrlFunctionOrString) => {
  return function moveAssetsInOrder(assetGraph) {
    const assetMover = createAssetMover(newUrlFunctionOrString, assetGraph);
    for (const assetBatch of findAssetMoveOrderBatches(assetGraph, queryObj)) {
      for (const asset of assetBatch) {
        assetMover(asset);
      }
    }
  };
};
