var _ = require('underscore'),
    step = require('step'),
    fileUtils = require('../fileUtils'),
    error = require('../error'),
    assets = require('../assets'),
    query = require('../query');

exports.populate = function (includeRelationQuery) {
    var includeRelationMatcher = query.queryObjToMatcherFunction(includeRelationQuery);
    return function populate(err, assetGraph, cb) {
        var assetQueue = assetGraph.findAssets({isInitial: true}),
            numWaitingCallbacks = 0,
            callbackCalled = false;

        cb = error.onlyCallOnce(cb);

        (function proceed() {
            numWaitingCallbacks += assetQueue.length;
            while (assetQueue.length) {
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
            var filteredOriginalRelations;
            step(
                function () {
                    asset.getOriginalRelations(this);
                },
                error.passToFunction(cb, function (originalRelations) {
                    filteredOriginalRelations = originalRelations.filter(includeRelationMatcher);
                    if (filteredOriginalRelations.length) {
                        var group = this.group();
                        filteredOriginalRelations.forEach(function (relation) {
                            assetGraph.resolver.resolve(relation.to, assetGraph.getBaseAssetForRelation(relation).url, group());
                        }, this);
                    } else {
                        return cb();
                    }
                }),
                error.passToFunction(cb, function (resolvedAssetConfigArrays) {
                    var lastSeenRelation;
                    function initializeAndAddRelation(relation) {
                        if (relation.to.url && relation.to.url in assetGraph.assetsByUrl) {
                            relation.to = assetGraph.assetsByUrl[relation.to.url];
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
                    resolvedAssetConfigArrays.forEach(function (resolvedAssetConfigs, i) {
                        if (!_.isArray(resolvedAssetConfigs)) {
                            // Simple assetGraph.resolveAssetConfig case
                            resolvedAssetConfigs = [resolvedAssetConfigs];
                        }
                        var originalRelation = filteredOriginalRelations[i];
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
                            });
                            asset.detachRelation(originalRelation);
                        } else {
                            cb(new Error("assetConfig resolved to multiple, but " + originalRelation.type + " doesn't support attachRelation"));
                        }
                    });
                    cb();
                })
            );
        }
    };
};
