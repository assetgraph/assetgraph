var _ = require('underscore'),
    urlTools = require('../util/urlTools'),
    cssom = require('cssom-papandreou'),
    AssetGraph = require('../AssetGraph'),
    bundleStrategyByName = {};

// Internal helper function. Reuses the parse trees of existing assets, so be careful!
function makeBundle(assetGraph, assetsToBundle) {
    if (assetsToBundle.length === 0) {
        throw new Error('makeBundle: Bundle must contain at least one asset');
    } else if (assetsToBundle.length === 1) {
        // Shortcut
        return [assetsToBundle[0]];
    }

    var type = assetsToBundle[0].type,
        incomingType = {Css: 'HtmlStyle', 'JavaScript': 'HtmlScript'}[type],
        parseTrees = _.pluck(assetsToBundle, 'parseTree'),
        constructorOptions = {};

    if (type === 'JavaScript') {
        var topLevelStatements = [];

        assetsToBundle.forEach(function (asset) {
            assetGraph.findRelations({from: asset, type: 'JavaScriptInclude'}, true).forEach(function (relation) {
                if (relation.parentNode === asset.parseTree[1]) {
                    // This INCLUDE relation is a top level statement, update its .parentNode property to point at
                    // the top level statements array of the bundle:
                    relation.parentNode = topLevelStatements;
                }
            });
            Array.prototype.push.apply(topLevelStatements, asset.parseTree[1]);
        });
        constructorOptions.parseTree = ['toplevel', topLevelStatements];

        constructorOptions.copyrightNoticeComments = [];
        assetsToBundle.forEach(function (javaScript) {
            if (javaScript.copyrightNoticeComments) {
                Array.prototype.push.apply(constructorOptions.copyrightNoticeComments, javaScript.copyrightNoticeComments);
            }
        });
    } else {
        // type === 'Css'
        constructorOptions.parseTree = new cssom.CSSStyleSheet();
        assetsToBundle.forEach(function (asset) {
            asset.parseTree.parentStyleSheet = constructorOptions.parseTree;
            Array.prototype.push.apply(constructorOptions.parseTree.cssRules, asset.parseTree.cssRules);
        });
    }

    var bundleAsset = new AssetGraph[type](constructorOptions);

    bundleAsset.url = urlTools.resolveUrl(assetGraph.root, bundleAsset.id + bundleAsset.extension);
    bundleAsset._outgoingRelations = assetGraph.findRelations({from: assetsToBundle});
    bundleAsset._outgoingRelations.forEach(function (outgoingRelation) {
        outgoingRelation.remove();
        outgoingRelation.from = bundleAsset;
    });

    var seenReferringAssets = {},
        incomingRelations = assetGraph.findRelations({type: incomingType, to: assetsToBundle});
    incomingRelations.forEach(function (incomingRelation) {
        if (!(incomingRelation.from.id in seenReferringAssets)) {
            var bundleRelation = new AssetGraph[incomingType]({
                to: bundleAsset
            });
            bundleRelation.attach(incomingRelation.from, 'before', incomingRelation);
            if (incomingType === 'HtmlStyle') {
                var media = incomingRelation.node.getAttribute('media');
                if (media && media !== 'all') {
                    bundleRelation.node.setAttribute('media', media);
                    bundleRelation.from.markDirty();
                }
            } else if (incomingType === 'HtmlScript') {
                for (var i = 0 ; i < incomingRelations.length ; i += 1) {
                    var otherIncomingRelation = incomingRelations[i];
                    if (otherIncomingRelation.node.hasAttribute('data-main')) {
                        var existingHtmlRequireJsMainRelations = assetGraph.findRelations({
                            from: otherIncomingRelation.from,
                            type: 'HtmlRequireJsMain'
                        }).filter(function (relation) {
                            return relation.node === otherIncomingRelation.node;
                        });
                        if (existingHtmlRequireJsMainRelations.length === 1) {
                            var existingHtmlRequireJsMainRelation = existingHtmlRequireJsMainRelations[0];
                            bundleRelation.node.setAttribute('data-main', otherIncomingRelation.node.getAttribute('data-main'));
                            existingHtmlRequireJsMainRelation.node = bundleRelation.node;
                            break;
                        } else {
                            throw new Error("transforms.bundleRelations: Unexpected number of existing HtmlRequireJsMain relations found");
                        }
                    }
                }
            }
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
        bundleAssets = [],
        relationsByIncludingAsset = {};

    assetGraph.findRelations(queryObj).forEach(function (relation) {
        assetsToBundleById[relation.to.id] = relation.to; // Means not in a bundle yet
        (relationsByIncludingAsset[relation.from.id] = relationsByIncludingAsset[relation.from.id] || []).push(relation);
    });

    Object.keys(relationsByIncludingAsset).forEach(function (includingAssetId) {
        var includingAsset = assetGraph.idIndex[includingAssetId],
            relationsToBundle = relationsByIncludingAsset[includingAssetId];

        _.unique(_.pluck(relationsToBundle, 'type')).forEach(function (relationType) {
            var currentBundle = [],
                bundleDiscriminator,
                relationsOfTypeToBundle = relationsToBundle.filter(function (relation) {
                    return relation.type === relationType;
                });

            function flushBundle() {
                if (currentBundle.length > 0) {
                    bundleAssets.push(makeBundle(assetGraph, currentBundle)); // FIXME
                    currentBundle = [];
                }
            }
            assetGraph.findRelations(assetGraph.constructor.query.or({type: relationType}, {type: 'HtmlConditionalComment'})).forEach(function (outgoingRelation) {
                if (outgoingRelation.type === 'HtmlConditionalComment') {
                    if (assetGraph.findRelations({from: outgoingRelation.to, type: relationType}, true).length > 0) {
                        flushBundle();
                    }
                } else if (relationsOfTypeToBundle.indexOf(outgoingRelation) !== -1) {
                    // Make sure that we don't bundle HtmlStyles with different media attributes together:
                    var discriminatorFragments = [];
                    if (outgoingRelation.conditionalComments) {
                        Array.prototype.push.apply(discriminatorFragments, _.pluck(outgoingRelation.conditionalComments, 'nodeValue'));
                    }
                    if (relationType === 'HtmlStyle') {
                        discriminatorFragments.push(outgoingRelation.node.getAttribute('media') || 'all');
                    }
                    var discriminator = discriminatorFragments.join(':');
                    if (bundleDiscriminator && discriminator !== bundleDiscriminator) {
                        flushBundle();
                    }
                    bundleDiscriminator = discriminator;
                    if (assetGraph.findRelations({to: outgoingRelation.to}).length > 1) {
                        currentBundle.push(outgoingRelation.to.clone(outgoingRelation));
                    } else {
                        currentBundle.push(outgoingRelation.to);
                    }
                } else {
                    flushBundle();
                }
            });
            flushBundle();
        });
    });
    return bundleAssets;
};

// Cross-page optimizing bundling strategy that never puts the same chunk in multiple bundles, but still tries
// to create as few bundles as possible. Also preserves inclusion order.
// FIXME: This bundling strategy is still quite buggy, please don't use it yet.
bundleStrategyByName.sharedBundles = function (assetGraph, queryObj) {
    var assetIndex = {},
        seenIncludingAssets = {},
        bundles = [],
        relationsByIncludingAsset = {};

    assetGraph.findRelations(queryObj).forEach(function (relation) {
        assetIndex[relation.to.id] = null; // Means not in a bundle yet
        seenIncludingAssets[relation.from.id] = relation.from;
        (relationsByIncludingAsset[relation.from.id] = relationsByIncludingAsset[relation.from.id] || []).push(relation);
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
        var relationsToBundle = relationsByIncludingAsset[includingAsset.id];

        _.unique(_.pluck(relationsToBundle, 'type')).forEach(function (relationType) {
            var outgoingRelations = assetGraph.findRelations({from: includingAsset, type: [relationType, 'HtmlConditionalComment']}, true), // includeUnresolved
                previousBundle,
                currentBundleDiscriminator,
                canAppendToPreviousBundle = false,
                previousBundleIndex;

            outgoingRelations.forEach(function (outgoingRelation) {
                if (outgoingRelation.type === 'HtmlConditionalComment') {
                    if (assetGraph.findRelations({from: outgoingRelation.to, type: relationType}).length > 0) {
                        canAppendToPreviousBundle = false;
                    }
                    return;
                }

                if (relationType === 'HtmlStyle') {
                    var discriminator = outgoingRelation.node.getAttribute('media') || 'all';
                    if (currentBundleDiscriminator && discriminator !== currentBundleDiscriminator) {
                        canAppendToPreviousBundle = false;
                    }
                    currentBundleDiscriminator = discriminator;
                }

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
    });

    return bundles.map(function (bundle) {
        return makeBundle(assetGraph, bundle);
    });
};

module.exports = function (queryObj, bundleStrategyName) {
    if (!bundleStrategyName) {
        bundleStrategyName = 'oneBundlePerIncludingAsset';
    } else if (!(bundleStrategyName in bundleStrategyByName)) {
        throw new Error("transforms.bundleRelations: Unknown bundle strategy: " + bundleStrategyName);
    }

    return function bundleRelations(assetGraph) {
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
