var URL = require('url'),
    crypto = require('crypto'),
    step = require('step'),
    error = require('../error'),
    query = require('../query');

// Helper function for determining the order in which the hashes can be computed and the assets
// renamed. The challenge lies in the fact that updating a relation to point at <hash>.<extension>
// will change the hash of the asset that owns the relation.
// Needless to say this will fail if the graph of assets to be renamed has cycles, so be careful.
function findAssetRenameOrderBatches(assetGraph, queryObj) {
    var batches = [],
        clone = assetGraph.clone(),
        assetMatcher = query.queryObjToMatcherFunction(queryObj),
        currentBatch;

    // Remove all assets not matched by queryObj
    clone.findAssets().forEach(function (asset) { // FIXME: Query
        if (!assetMatcher(asset)) {
            clone.removeAsset(asset, true); // cascade (also remove incoming and outgoing relations)
        }
    });

    while (clone.assets.length) {
        currentBatch = [];
        clone.findAssets().forEach(function (asset) {
            if (!clone.findRelations({from: asset}).length) {
                currentBatch.push(asset);
            }
        });

        currentBatch.forEach(function (asset) {
            clone.removeAsset(asset, true); // Cascade
        });

        if (currentBatch.length === 0) {
            throw new Error("transforms.renameAssetsToMD5Prefix: Couldn't find a suitable rename order due to cycles in the selection");
        }
        batches.push(currentBatch);
    }
    return batches;
};

exports.renameAssetsToMD5Prefix = function (queryObj) {
    return function renameAssetsToMD5Prefix(err, assetGraph, cb) {
        if (err) {
            throw err;
        }
        function renameBatch(assetBatch, cb) {
            step(
                function () {
                    var group = this.group();
                    assetBatch.forEach(function (asset) {
                        var callback = group();
                        assetGraph.getSerializedAsset(asset, error.passToFunction(callback, function (src) {
                            var md5Prefix = crypto.createHash('md5').update(src).digest('hex').substr(0, 10),
                                newUrl = URL.resolve(asset.url, md5Prefix + '.' + asset.defaultExtension);
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
                                        }
                                    });
                                    assetGraph.removeAsset(asset, true); // Cascade to remove outgoing relations
                                    // Hack to get the reattached relations refreshed:
                                    assetGraph.setAssetUrl(duplicateAsset, duplicateAsset.url);
                                } else {
                                    assetGraph.setAssetUrl(asset, newUrl);
                                }
                            }
                            callback();
                        }));
                    }, this);
                    process.nextTick(group()); // Making sure we proceed to the next step
                },
                cb
            );
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
