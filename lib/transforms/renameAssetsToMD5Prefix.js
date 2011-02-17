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
    return function renameAssetsToMD5Prefix(assetGraph, cb) {
        function renameBatch(assetBatch, cb) {
            step(
                function () {
                    var group = this.group();
                    assetBatch.forEach(function (asset) {
                        var callback = group();
                        assetGraph.serializeAsset(asset, error.passToFunction(error.logAndExit(), function (src) {
                            var md5Prefix = crypto.createHash('md5').update(src, asset.encoding).digest('hex').substr(0, 10);
                            assetGraph.setAssetUrl(asset, URL.resolve(asset.url, md5Prefix + '.' + asset.defaultExtension));
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
