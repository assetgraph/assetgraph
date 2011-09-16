var urlTools = require('../util/urlTools'),
    crypto = require('crypto'),
    query = require('../query');

// Helper function for determining the order in which the hashes can be computed and the assets
// renamed. The challenge lies in the fact that updating a relation to point at <hash>.<extension>
// will change the hash of the asset that owns the relation.
// Needless to say this will fail if the graph of assets to be renamed has cycles, so be careful.
function findAssetRenameOrderBatches(assetGraph, queryObj) {
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
            throw new Error("transforms.renameAssetsToMd5Prefix: Couldn't find a suitable rename order due to cycles in the selection");
        }
        batches.push(currentBatch);
    }
    return batches;
}

module.exports = function (queryObj) {
    return function renameAssetsToMd5Prefix(assetGraph) {
        findAssetRenameOrderBatches(assetGraph, queryObj).forEach(function (assetBatch) {
            assetBatch.forEach(function (asset) {
                var md5Prefix = crypto.createHash('md5').update(asset.rawSrc).digest('hex').substr(0, 10),
                    newUrl = urlTools.resolveUrl(asset.url, md5Prefix + asset.extension);
                if (newUrl !== asset.url) {
                    if (newUrl in assetGraph.urlIndex) {
                        var duplicateAsset = assetGraph.urlIndex[newUrl];
                        assetGraph.findRelations({to: asset}).forEach(function (incomingRelation) {
                            // FIXME: Cache manifest entries shouldn't receive special treatment here.
                            // Find another way to prevent duplicates:
                            if (incomingRelation.type === 'CacheManifestEntry') {
                                incomingRelation.detach();
                                assetGraph.removeRelation(incomingRelation);
                            } else {
                                incomingRelation.to = duplicateAsset;
                                incomingRelation.refreshHref();
                            }
                        });
                        assetGraph.removeAsset(asset);
                    } else {
                        asset.url = newUrl;
                    }
                }
            });
        });
    };
};
