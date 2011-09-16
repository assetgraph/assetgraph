var _ = require('underscore'),
    urlTools = require('../util/urlTools'),
    assets = require('../assets'),
    relations = require('../relations'),
    bundleStrategyByName = {};

// Internal helper function. Reuses the parse trees of existing assets, so be careful!
function makeBundle(assetGraph, queryObj, assetsToBundle) {
    if (assetsToBundle.length === 0) {
        throw new Error('makeBundle: Bundle must contain at least one asset');
    } else if (assetsToBundle.length === 1) {
        // Shortcut
        return [assetsToBundle[0]];
    }
    var bundleAsset = new assets[queryObj.type]({
        parseTree: assets[queryObj.type].mergeParseTrees(_.pluck(assetsToBundle, 'parseTree'))
    });
    bundleAsset.url = urlTools.resolveUrl(assetGraph.root, bundleAsset.id + bundleAsset.extension);

    var seenReferringAssets = {};
    assetGraph.findRelations({type: queryObj.incoming.type, to: assetsToBundle}).forEach(function (incomingRelation) {
        if (!(incomingRelation.from.id in seenReferringAssets)) {
            new relations[queryObj.incoming.type]({
                to: bundleAsset
            }).attach(incomingRelation.from, 'before', incomingRelation);
            seenReferringAssets[incomingRelation.from.id] = true;
        }
        incomingRelation.detach();
    });

    assetGraph.addAsset(bundleAsset);

    assetsToBundle.forEach(function (asset) {
        if (assetGraph.findRelations({to: asset}).length === 0) {
            assetGraph.removeAsset(asset);
        }
    });
    return bundleAsset;
}

// Quick and dirty bundling strategy that gets you down to one <script> and one <link rel='stylesheet'>
// per document, but doesn't do any cross-page optimization.
bundleStrategyByName.oneBundlePerIncludingAsset = function (assetGraph, queryObj) {
    var assetsToBundleById = {},
        seenIncludingAssets = {},
        bundleAssets = [];

    assetGraph.findAssets(queryObj).forEach(function (asset) {
        assetsToBundleById[asset.id] = asset;
        assetGraph.findRelations({type: queryObj.incoming.type, to: asset}).forEach(function (incomingRelation) {
            seenIncludingAssets[incomingRelation.from.id] = incomingRelation.from;
        });
    });

    _.values(seenIncludingAssets).forEach(function (includingAsset) {
        var assetsToBundle = assetGraph.findRelations({from: includingAsset, type: queryObj.incoming.type}).filter(function (outgoingRelation) {
            return outgoingRelation.to.id in assetsToBundleById;
        }).map(function (outgoingRelation) {
            if (assetGraph.findRelations({to: outgoingRelation.to}).length > 1) {
                return outgoingRelation.to.clone(outgoingRelation);
            } else {
                return outgoingRelation.to;
            }
        });
        bundleAssets.push(makeBundle(assetGraph, queryObj, assetsToBundle));
    });
    return bundleAssets;
};

// Cross-page optimizing bundling strategy that never puts the same chunk in multiple bundles, but still tries
// to create as few bundles as possible. Also preserves inclusion order.
// FIXME: This bundling strategy is still quite buggy, please don't use it yet.
bundleStrategyByName.sharedBundles = function (assetGraph, queryObj) {
    var allAssets = assetGraph.findAssets(queryObj),
        assetIndex = {},
        seenIncludingAssets = {},
        bundles = [];

    allAssets.forEach(function (asset) {
        assetIndex[asset.id] = null; // Means not in a bundle yet
        assetGraph.findRelations({type: queryObj.incoming.type, to: asset}).forEach(function (incomingRelation) {
            seenIncludingAssets[incomingRelation.from.id] = incomingRelation.from;
        });
    });

    function splitBundle(bundle, index) {
        var newBundle = bundle.splice(index);
        newBundle.forEach(function (asset) {
            assetIndex[asset.id] = newBundle;
        });
        bundles.push(newBundle);
        return newBundle;
    }

    _.values(seenIncludingAssets).forEach(function (includingAsset) {
        var outgoingRelations = assetGraph.findRelations({from: includingAsset, type: queryObj.incoming.type}, true), // includeUnresolved
            previousBundle,
            canAppendToPreviousBundle = false,
            previousBundleIndex;

        outgoingRelations.forEach(function (outgoingRelation) {
            var existingBundle = assetIndex[outgoingRelation.to.id];
            if (existingBundle === null) {
                // Not bundled yet, append to previousBundle if possible, else create a new one
                if (canAppendToPreviousBundle) {
                    previousBundle.push(outgoingRelation.to);
                    previousBundleIndex = previousBundle.length - 1;
                } else {
                    if (previousBundle && previousBundleIndex !== previousBundle.length - 1) {
                        splitBundle(previousBundle, previousBundleIndex);
                    }
                    previousBundle = [outgoingRelation.to];
                    previousBundleIndex = 0;
                    bundles.push(previousBundle);
                    canAppendToPreviousBundle = true;
                }
                assetIndex[outgoingRelation.to.id] = previousBundle;
            } else if (existingBundle) {
                // Already in another bundle
                canAppendToPreviousBundle = false;
                var indexInExistingBundle = existingBundle.indexOf(outgoingRelation.to);
                if (previousBundle && existingBundle === previousBundle) {
                    if (indexInExistingBundle === previousBundleIndex + 1) {
                        previousBundleIndex = indexInExistingBundle;
                    } else {
                        splitBundle(previousBundle, indexInExistingBundle + 1);
                        existingBundle = assetIndex[outgoingRelation.to.id];
                        indexInExistingBundle = existingBundle.indexOf(outgoingRelation.to);
                        if (indexInExistingBundle !== 0) {
                            existingBundle = splitBundle(existingBundle, indexInExistingBundle);
                        }
                        previousBundle = existingBundle;
                        previousBundleIndex = 0;
                    }
                } else {
                    if (previousBundle && previousBundleIndex !== (previousBundle.length - 1)) {
                        splitBundle(previousBundle, previousBundleIndex + 1);
                    }
                    if (indexInExistingBundle !== 0) {
                        existingBundle = splitBundle(existingBundle, indexInExistingBundle);
                    }
                    previousBundle = existingBundle;
                    previousBundleIndex = 0;
                }
            } else {
                // The relation doesn't point at an asset matched by queryObj
                previousBundle = null;
                canAppendToPreviousBundle = false;
            }
        });
        // No more outgoing relations for this asset, make sure that the asset that was bundled
        // last is at the last position in its bundle:
        if (previousBundle && previousBundleIndex !== previousBundle.length - 1) {
            splitBundle(previousBundle, previousBundleIndex + 1);
        }
    });

    return bundles.map(function (bundle) {
        return makeBundle(assetGraph, queryObj, bundle);
    });
};

module.exports = function (queryObj, bundleStrategyName) {
    if (!('type' in queryObj) || !/^(?:Css|JavaScript)$/.test(queryObj.type)) {
        throw new Error("transforms.bundleAssets: queryObj must have a 'type' property of 'JavaScript' or 'Css'");
    }
    if (!queryObj.incoming || !queryObj.incoming.type) {
        throw new Error("transforms.bundleAssets: queryObj must have an 'incoming' obj with a 'type' property");
    }
    if (!bundleStrategyName) {
        bundleStrategyName = 'oneBundlePerIncludingAsset';
    } else if (!(bundleStrategyName in bundleStrategyByName)) {
        throw new Error("transforms.bundleAssets: Unknown bundle strategy: " + bundleStrategyName);
    }

    return function bundleAssets(assetGraph) {
        var bundleAssets = bundleStrategyByName[bundleStrategyName](assetGraph, queryObj);
        assetGraph.recomputeBaseAssets();
        bundleAssets.forEach(function (bundleAsset) {
            assetGraph.findRelations({to: bundleAsset}).forEach(function (incomingRelation) {
                incomingRelation.refreshHref();
            });
            assetGraph.findRelations({from: bundleAsset}).forEach(function (outgoingRelation) {
                outgoingRelation.refreshHref();
            });
        });
    };
};
