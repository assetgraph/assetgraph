var _ = require('underscore'),
    seq = require('seq'),
    passError = require('../util/passError'),
    assets = require('../assets'),
    query = require('../query');

module.exports = function (options) {
    options = options || {};
    var followRelationsMatcher = query.queryObjToMatcherFunction(options.followRelations);
    return function populate(assetGraph, cb) {
        var assetQueue = assetGraph.findAssets(options.from),
            maxWaitingCallbacks = 100,
            numWaitingCallbacks = 0,
            firstErrorOrNull = null;

        (function proceed() {
            while (!firstErrorOrNull && assetQueue.length && numWaitingCallbacks < maxWaitingCallbacks) {
                numWaitingCallbacks += 1;
                processAsset(assetQueue.shift(), function (err) {
                    if (err && !firstErrorOrNull) {
                        firstErrorOrNull = err;
                    }
                    numWaitingCallbacks -= 1;
                    proceed();
                });
            }
            if (numWaitingCallbacks === 0) {
                cb(firstErrorOrNull);
            }
        }());

        function processAsset(asset, cb) {
            var lastSeenRelation;
            seq()
                .seq(function () {
                    if (options.forceLoad) {
                        var callback = this;
                        asset.getRawSrc(function (err) {
                            if (err && options.onError) {
                                options.onError(err, assetGraph, asset);
                                cb();
                            } else {
                                callback(err);
                            }
                        });
                    } else {
                        this();
                    }
                })
                .seq(function () {
                    var callback = this;
                    asset.getOriginalRelations(function (err, originalRelations) {
                        if (err && options.onError) {
                            options.onError(err, assetGraph, asset);
                            cb();
                        } else {
                            callback(err, originalRelations);
                        }
                    });
                })
                .flatten()
                .parEach(function (originalRelation) {
                    var callback = this.into(originalRelation.id);
                    assetGraph.resolveAssetConfig(originalRelation.to, assetGraph.getBaseAssetForRelation(originalRelation).url, function (err, resolvedAssetConfigs) {
                        if (err && options.onError) {
                            options.onError(err, assetGraph, asset, relation);
                            callback(null, null);
                        } else {
                            callback(err, resolvedAssetConfigs);
                        }
                    });
                })
                .parEach(function (originalRelation) {
                    var resolvedAssetConfigs = this.vars[originalRelation.id];
                    if (resolvedAssetConfigs === null) {
                        // Error already handled by options.onError, don't add relation to graph
                        this();
                    }
                    assetGraph.multiplyRelationBasedOnResolvedAssetConfigs(originalRelation, resolvedAssetConfigs).forEach(function (relation) {
                        if (followRelationsMatcher(relation)) {
                            if (relation.to.url && relation.to.url in assetGraph.urlIndex) {
                                relation.to = assetGraph.urlIndex[relation.to.url];
                            } else {
                                relation.to = assets.create(relation.to);
                                assetGraph.addAsset(relation.to);
                                assetQueue.push(relation.to);
                            }
                        }
                        if (lastSeenRelation) {
                            assetGraph.addRelation(relation, 'after', lastSeenRelation);
                        } else {
                            assetGraph.addRelation(relation, 'first');
                        }
                        lastSeenRelation = relation;
                    });
                    this();
                })
                .seq(function () {
                    cb();
                })
                ['catch'](cb);
        }
    };
};
