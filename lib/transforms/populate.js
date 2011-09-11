var _ = require('underscore'),
    seq = require('seq'),
    passError = require('../util/passError'),
    assets = require('../assets'),
    query = require('../query');

function multiplyRelationBasedOnResolvedAssetConfigs(assetGraph, originalRelation, resolvedAssetConfigs) {
    if (!originalRelation || !originalRelation.isRelation) {
        throw new Error("multiplyRelationBasedOnResolvedAssetConfigs: Not a relation: ", originalRelation);
    }
    if (!_.isArray(resolvedAssetConfigs)) {
        // Simple case
        resolvedAssetConfigs = [resolvedAssetConfigs];
    }
    if (resolvedAssetConfigs.length === 0) {
        originalRelation.detach();
        originalRelation.from.markDirty();
        return [];
    } else if (resolvedAssetConfigs.length === 1) {
        originalRelation.to = resolvedAssetConfigs[0];
        return [originalRelation];
    } else {
        var multipliedRelations = [];
        resolvedAssetConfigs.forEach(function (resolvedAssetConfig) {
            var relation = new originalRelation.constructor({
                from: originalRelation.from,
                to: resolvedAssetConfig
            });
            relation.attach(relation.from, 'before', originalRelation);
            assetGraph.refreshRelationHref(relation);
            multipliedRelations.push(relation);
        });
        originalRelation.detach();
        originalRelation.from.markDirty();
        return multipliedRelations;
    }
}

module.exports = function (options) {
    options = options || {};
    var followRelationsMatcher = query.queryObjToMatcherFunction(options.followRelations);
    return function populate(assetGraph, cb) {
        var assetQueue = assetGraph.findAssets(options.from),
            maxWaitingCallbacks = options.concurrency || 100,
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
                    var callback = this;
                    asset.load(function (err) {
                        if (err) {
                            if (options.onError) {
                                options.onError(err, assetGraph, asset);
                            } else {
                                return cb(err);
                            }
                        }
                        callback();
                    });
                })
                .seq(function () {
                    var originalRelations = [];
                    if (!asset.noOriginalRelations) {
                        try {
                            originalRelations = asset.createOriginalRelations();
                        } catch (e) {
                            if (options.onError) {
                                options.onError(err, assetGraph, asset);
                                this(null, []);
                            } else {
                                this(e);
                            }
                            return;
                        }
                    }
                    this(null, originalRelations);
                })
                .flatten()
                .parEach(function (originalRelation) {
                    var callback = this.into(originalRelation.id),
                        baseAsset = originalRelation.baseAsset;
                    if (!baseAsset) {
                        return callback(new Error("transforms.populate: Couldn't find base asset for relation" + originalRelation));
                    }
                    assets.resolveConfig(originalRelation.to, baseAsset.url, assetGraph, function (err, resolvedAssetConfigs) {
                        if (err && options.onError) {
                            options.onError(err, assetGraph, asset, originalRelation);
                            callback(null, null);
                        } else {
                            callback(err, resolvedAssetConfigs);
                        }
                    });
                })
                .parEach(function (originalRelation) {
                    if (options.ensureType) {
                        assets.ensureAssetConfigHasType(originalRelation.to, this);
                    } else {
                        this();
                    }
                })
                .seqEach(function (originalRelation) {
                    var resolvedAssetConfigs = this.vars[originalRelation.id];
                    if (resolvedAssetConfigs === null) {
                        // Error already handled by options.onError, don't add relation to graph
                        return this();
                    }
                    var callback = this;
                    seq(multiplyRelationBasedOnResolvedAssetConfigs(assetGraph, originalRelation, resolvedAssetConfigs))
                        .seqEach(function (multipliedRelation) {
                            function addMultipliedRelation() {
                                if (lastSeenRelation) {
                                    assetGraph.addRelation(multipliedRelation, 'after', lastSeenRelation);
                                } else {
                                    assetGraph.addRelation(multipliedRelation, 'first');
                                }
                                lastSeenRelation = multipliedRelation;
                            }
                            if (followRelationsMatcher(multipliedRelation)) {
                                assets.ensureAssetConfigHasType(multipliedRelation.to, function () {
                                    if (multipliedRelation.to.url && multipliedRelation.to.url in assetGraph.urlIndex) {
                                        multipliedRelation.to = assetGraph.urlIndex[multipliedRelation.to.url];
                                    } else {
                                        multipliedRelation.to = assets.create(multipliedRelation.to);
                                        assetGraph.addAsset(multipliedRelation.to);
                                        assetQueue.push(multipliedRelation.to);
                                    }
                                    addMultipliedRelation();
                                    this();
                                }.bind(this));
                            } else {
                                addMultipliedRelation();
                                process.nextTick(this);
                            }
                        })
                        .seq(function () {
                            callback();
                        })
                        ['catch'](callback);
                })
                .seq(function () {
                    cb();
                })
                ['catch'](cb);
        }
    };
};
