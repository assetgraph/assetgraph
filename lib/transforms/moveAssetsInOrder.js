const compileQuery = require('../compileQuery');
const createAssetMover = require('../util/assetMover');

/** @typedef {import('../AssetGraph')} AssetGraph */
/** @typedef {import('../assets/Asset')} Asset */
/** @typedef {import('../relations/Relation')} Relation */

/**
 *
 * @param {AssetGraph} assetGraph
 * @param {object} queryObj
 */

// Helper function for determining the order in which the hashes can be computed and the assets
// moved. The challenge lies in the fact that updating a relation to point at <hash>.<extension>
// will change the hash of the asset that owns the relation.
// Needless to say this will fail if the graph of assets to be moved has cycles, so be careful.
function* generateMoveOrder(assetGraph, queryObj) {
  /** @type {Map<Asset, Relation[]>} */
  const outgoingRelationsByAsset = new Map();
  const assetMatcher = compileQuery(queryObj);

  // Create map of file-assets and their relations to other file-assets
  for (const asset of assetGraph.findAssets({ isInline: false })) {
    if (assetMatcher(asset)) {
      const relationFrom = assetGraph.collectAssetsPostOrder(asset, {
        to: { isInline: true },
      });
      const relationTo = { isInline: false };
      // Filter source map file relation to prevent possible recursion
      outgoingRelationsByAsset.set(
        asset,
        assetGraph
          .findRelations({
            from: { id: { $in: relationFrom.map((relation) => relation.id) } },
            to: relationTo,
            type: { $not: 'SourceMapFile' },
          })
          .filter((relation) => relation.to !== asset)
      );
    }
  }

  while (true) {
    if (outgoingRelationsByAsset.size === 0) {
      break;
    }

    /** @type {Asset[]} */
    const currentBatch = [];

    // Find batches of assets that point to no other files in the map
    for (const [
      asset,
      outgoingRelations,
    ] of outgoingRelationsByAsset.entries()) {
      if (
        !outgoingRelations.some((outgoingRelation) =>
          outgoingRelationsByAsset.has(outgoingRelation.to)
        )
      ) {
        currentBatch.push(asset);
      }
    }

    // Remove assets in current batch from file-asset map
    for (const asset of currentBatch) {
      outgoingRelationsByAsset.delete(asset);
    }

    // There are assets left in the map which have relations to other
    // assets in the map.
    // At this point that can only happen if there is one or more
    // dependency circles in the graph represented by the remaining
    // map of assets
    if (currentBatch.length === 0) {
      const warning = new Error(
        'transforms.moveAssetsInOrder: Cyclic dependencies detected. All files could not be moved'
      );

      const relevantRelations = []
        .concat(...outgoingRelationsByAsset.values())
        .filter((relation) => outgoingRelationsByAsset.has(relation.to));

      warning.relations = relevantRelations;

      assetGraph.emit('warn', warning);

      break;
    }

    yield* currentBatch;
  }
}

module.exports = (queryObj, newUrlFunctionOrString) => {
  return function moveAssetsInOrder(assetGraph) {
    const assetMover = createAssetMover(newUrlFunctionOrString, assetGraph);
    for (const asset of generateMoveOrder(assetGraph, queryObj)) {
      assetMover(asset);
    }
  };
};
