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
                    var outgoingRelations = [];
                    try {
                        outgoingRelations = asset.outgoingRelations;
                    } catch (e) {
                        if (options.onError) {
                            options.onError(err, assetGraph, asset);
                            this(null, []);
                        } else {
                            this(e);
                        }
                        return;
                    }
                    this(null, outgoingRelations);
                })
                .flatten()
                .parEach(function (outgoingRelation) {
                    var callback = this.into(outgoingRelation.id),
                        baseAsset = assetGraph.getBaseAssetForRelation(outgoingRelation);
                    if (!baseAsset) {
                        return callback(new Error("transforms.populate: Couldn't find base asset for relation" + outgoingRelation));
                    }
                    assets.resolveConfig(outgoingRelation.to, baseAsset.url, assetGraph, function (err, resolvedAssetConfigs) {
                        if (err && options.onError) {
                            options.onError(err, assetGraph, asset, outgoingRelation);
                            callback(null, null);
                        } else {
                            callback(err, resolvedAssetConfigs);
                        }
                    });
                })
                .parEach(function (outgoingRelation) {
                    if (options.ensureType) {
                        assets.ensureAssetConfigHasType(outgoingRelation.to, this);
                    } else {
                        this();
                    }
                })
                .seqEach(function (outgoingRelation) {
                    var resolvedAssetConfigs = this.vars[outgoingRelation.id];
                    if (resolvedAssetConfigs === null) {
                        // Error already handled by options.onError, don't add relation to graph
                        return this();
                    }
                    var callback = this;
                    seq(assetGraph.multiplyRelationBasedOnResolvedAssetConfigs(outgoingRelation, resolvedAssetConfigs))
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
