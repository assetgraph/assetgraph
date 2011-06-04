var urlTools = require('../util/urlTools'),
    crypto = require('crypto'),
    seq = require('seq'),
    passError = require('../util/passError'),
    query = require('../query'),
    traversal = require('../traversal');

// Helper function for determining the order in which the hashes can be computed and the assets
// renamed. The challenge lies in the fact that updating a relation to point at <hash>.<extension>
// will change the hash of the asset that owns the relation.
// Needless to say this will fail if the graph of assets to be renamed has cycles, so be careful.
function findAssetRenameOrderBatches(assetGraph, queryObj) {
    var batches = [],
        clone = assetGraph.clone(),
        assetMatcher = query.queryObjToMatcherFunction(queryObj),
        assetPlusInlinedByAssetId = {},
        currentBatch;

    // Remove all non-inline assets not matched by queryObj (implicitly removes their inline assets):
    clone.findAssets({url: query.isDefined}).forEach(function (asset) { // FIXME: Query
        if (!assetMatcher(asset)) {
            clone.removeAsset(asset);
        } else {
            assetPlusInlinedByAssetId[asset.id] = traversal.collectAssetsPostOrder(assetGraph, asset, {to: {url: query.isUndefined}});
        }
    });

    while (clone.findAssets().length) {
        currentBatch = [];
        clone.findAssets({url: query.isDefined}).forEach(function (asset) {
            if (!clone.findRelations({from: assetPlusInlinedByAssetId[asset.id], to: {url: query.isDefined}}).length) {
                currentBatch.push(asset);
            }
        });

        currentBatch.forEach(function (asset) {
            clone.removeAsset(asset);
        });

        if (currentBatch.length === 0) {
            throw new Error("transforms.renameAssetsToMd5Prefix: Couldn't find a suitable rename order due to cycles in the selection");
        }
        batches.push(currentBatch);
    }
    return batches;
}

module.exports = function (queryObj) {
    return function renameAssetsToMd5Prefix(assetGraph, cb) {
        function renameBatch(assetBatch, cb) {
            seq(assetBatch)
                .parMap(40, function (asset) {
                    var callback = this;
                    assetGraph.getSerializedAsset(asset, passError(callback, function (src) {
                        var md5Prefix = crypto.createHash('md5').update(src).digest('hex').substr(0, 10),
                            newUrl = urlTools.resolveUrl(asset.url, md5Prefix + asset.getExtension());
                        if (newUrl !== asset.url) {
                            if (newUrl in assetGraph.urlIndex) {
                                var duplicateAsset = assetGraph.urlIndex[newUrl];
                                assetGraph.findRelations({to: asset}).forEach(function (incomingRelation) {
                                    // FIXME: Cache manifest entries shouldn't receive special treatment here.
                                    // Find another way to prevent duplicates:
                                    if (incomingRelation.type === 'CacheManifestEntry') {
                                        assetGraph.detachAndRemoveRelation(incomingRelation);
                                    } else {
                                        assetGraph.removeRelation(incomingRelation);
                                        incomingRelation.to = duplicateAsset;
                                        assetGraph.addRelation(incomingRelation);
                                        assetGraph.refreshRelationUrl(incomingRelation);
                                    }
                                });
                                assetGraph.removeAsset(asset);
                            } else {
                                assetGraph.setAssetUrl(asset, newUrl);
                            }
                        }
                        callback();
                    }));
                })
                .seq(function () {
                    cb();
                })
                ['catch'](cb);
            }

        var batches = findAssetRenameOrderBatches(assetGraph, queryObj);

        function proceed() {
            if (batches.length) {
                renameBatch(batches.shift(), proceed);
            } else {
                cb();
            }
        }
        proceed();
    };
};
