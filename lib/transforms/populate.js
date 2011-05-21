var _ = require('underscore'),
    seq = require('seq'),
    error = require('../util/error'),
    assets = require('../assets'),
    query = require('../query');

module.exports = function (includeRelationQuery, initialAssetsQuery) { // includeRelationQuery and initialAssetsQuery are optional
    var includeRelationMatcher = query.queryObjToMatcherFunction(includeRelationQuery);
    return function populate(assetGraph, cb) {
        var assetQueue = assetGraph.findAssets(initialAssetsQuery),
            maxWaitingCallbacks = 100,
            numWaitingCallbacks = 0,
            callbackCalled = false;

        cb = error.onlyCallOnce(cb);

        (function proceed() {
            while (assetQueue.length && numWaitingCallbacks < maxWaitingCallbacks) {
                numWaitingCallbacks += 1;
                processAsset(assetQueue.shift(), function (err) {
                    if (err) {
                        cb(err);
                    }
                    numWaitingCallbacks -= 1;
                    proceed();
                });
            }
            if (!numWaitingCallbacks) {
                cb();
            }
        })();

        function processAsset(asset, cb) {
            var lastSeenRelation;

            function initializeAndAddRelation(relation) {
                if (relation.to.url && relation.to.url in assetGraph.urlIndex) {
                    relation.to = assetGraph.urlIndex[relation.to.url];
                } else {
                    relation.to = assets.create(relation.to);
                    assetGraph.addAsset(relation.to);
                    assetQueue.push(relation.to);
                }
                if (lastSeenRelation) {
                    assetGraph.addRelation(relation, 'after', lastSeenRelation);
                } else {
                    assetGraph.addRelation(relation, 'first');
                }
                lastSeenRelation = relation;
            }

            seq()
                .seq(function () {
                    asset.getOriginalRelations(this);
                })
                .seq(function (originalRelations) {
                    this(null, originalRelations.filter(includeRelationMatcher));
                })
                .flatten()
                .parEach(function (originalRelation) {
                    assetGraph.resolver.resolve(originalRelation.to, assetGraph.getBaseAssetForRelation(originalRelation).url, this.into(originalRelation.id));
                })
                .parEach(function (originalRelation) {
                    var resolvedAssetConfigs = this.vars[originalRelation.id],
                        lastSeenRelation;
                    if (!_.isArray(resolvedAssetConfigs)) {
                        // Simple case
                        resolvedAssetConfigs = [resolvedAssetConfigs];
                    }
                    if (resolvedAssetConfigs.length === 0) {
                        asset.detachRelation(originalRelation);
                    } else if (resolvedAssetConfigs.length === 1) {
                        originalRelation.to = resolvedAssetConfigs[0];
                        initializeAndAddRelation(originalRelation);
                    } else if (asset.attachRelation) {
                        resolvedAssetConfigs.forEach(function (resolvedAssetConfig) {
                            var relation = new originalRelation.constructor({
                                from: asset,
                                to: resolvedAssetConfig
                            });
                            initializeAndAddRelation(relation);
                            relation.from.attachRelation(relation, 'before', originalRelation);
                            assetGraph.refreshRelationUrl(relation);
                        });
                        asset.detachRelation(originalRelation);
                    } else {
                        return cb(new Error("assetConfig resolved to multiple, but " + originalRelation.type + " doesn't support attachRelation"));
                    }
                    this();
                })
                .seq(function () {
                    cb();
                })
                ['catch'](cb);
        }
    };
};
