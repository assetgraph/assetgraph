var urlTools = require('../util/urlTools'),
    query = require('../query');

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
            outgoingRelationsByAssetId[asset.id] = assetGraph.findRelations({from: assetGraph.collectAssetsPostOrder(asset, {to: {isInline: true}}), to: {isInline: false}});
        }
    });

    while (true) {
        var remainingAssetIds = Object.keys(outgoingRelationsByAssetId);
        if (remainingAssetIds.length === 0) {
            break;
        }
        var currentBatch = [];
        remainingAssetIds.forEach(function (assetId) {
            if (!outgoingRelationsByAssetId[assetId].some(function (outgoingRelation) {return outgoingRelation.to.id in outgoingRelationsByAssetId;})) {
                currentBatch.push(assetGraph.idIndex[assetId]);
            }
        });

        currentBatch.forEach(function (asset) {
            delete outgoingRelationsByAssetId[asset.id];
        });

        if (currentBatch.length === 0) {
            throw new Error("transforms.moveAssetsInOrder: Couldn't find a suitable rename order due to cycles in the selection");
        }
        batches.push(currentBatch);
    }
    return batches;
}

module.exports = function (queryObj, newUrlFunctionOrString) {
    if (!newUrlFunctionOrString) {
        throw new Error("transforms.moveAssetsInOrder: 'newUrlFunctionOrString' parameter is mandatory.");
    }
    return function moveAssetsInOrder(assetGraph) {
        findAssetMoveOrderBatches(assetGraph, queryObj).forEach(function (assetBatch) {
            assetBatch.forEach(function (asset) {
                var newUrl = typeof newUrlFunctionOrString === 'function' ? newUrlFunctionOrString(asset, assetGraph) : String(newUrlFunctionOrString);
                if (newUrl) {
                    // Keep the old file name, query string and fragment identifier if the new url ends in a slash:
                    if (asset.url && /\/$/.test(newUrl)) {
                        var matchOldFileNameQueryStringAndFragmentIdentifier = asset.url.match(/[^\/]*(?:[\?#].*)?$/);
                        if (matchOldFileNameQueryStringAndFragmentIdentifier) {
                            newUrl += matchOldFileNameQueryStringAndFragmentIdentifier[0];
                        }
                    }
                    // FIXME: This only makes sense if the previous url was file:
                    if (/^\//.test(newUrl)) {
                        newUrl = assetGraph.root + newUrl.replace(/^\//, "");
                    } else {
                        newUrl = urlTools.resolveUrl(assetGraph.root, newUrl);
                    }
                    asset.url = newUrl;
                }
            });
        });
    };
};
