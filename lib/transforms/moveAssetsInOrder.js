var query = require('../query');
var assetMover = require('../util/assetMover');

// Helper function for determining the order in which the hashes can be computed and the assets
// moved. The challenge lies in the fact that updating a relation to point at <hash>.<extension>
// will change the hash of the asset that owns the relation.
// Needless to say this will fail if the graph of assets to be moved has cycles, so be careful.
function findAssetMoveOrderBatches(assetGraph, queryObj) {
    var batches = [],
        outgoingRelationsByAssetId = {},
        assetMatcher = query.queryObjToMatcherFunction(queryObj);

    assetGraph.findAssets({isInline: false}).forEach(function (asset) {
        if (assetMatcher(asset)) {
            var relationFrom = assetGraph.collectAssetsPostOrder(asset, {to: {isInline: true}});
            var relationTo = {isInline: false};
            // Filter source map file relation to prevent possible recursion
            outgoingRelationsByAssetId[asset.id] = assetGraph.findRelations({from: relationFrom, to: relationTo, type: query.not(['SourceMapFile'])});
        }
    });

    while (true) {
        var remainingAssetIds = Object.keys(outgoingRelationsByAssetId);
        if (remainingAssetIds.length === 0) {
            break;
        }
        var currentBatch = [];
        remainingAssetIds.forEach(function (assetId) {
            if (!outgoingRelationsByAssetId[assetId].some(function (outgoingRelation) { return outgoingRelationsByAssetId[outgoingRelation.to.id]; })) {
                currentBatch.push(assetGraph.idIndex[assetId]);
            }
        });

        currentBatch.forEach(function (asset) {
            delete outgoingRelationsByAssetId[asset.id];
        });

        if (currentBatch.length === 0) {
            throw new Error('transforms.moveAssetsInOrder: Couldn\'t find a suitable rename order due to cycles in the selection');
        }
        batches.push(currentBatch);
    }
    return batches;
}

module.exports = function (queryObj, newUrlFunctionOrString) {
    return function moveAssetsInOrder(assetGraph) {
        findAssetMoveOrderBatches(assetGraph, queryObj).forEach(function (assetBatch) {
            assetBatch.forEach(assetMover(newUrlFunctionOrString, assetGraph));
        });
    };
};
