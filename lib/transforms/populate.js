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
                    var _relations = [];
                    try {
                        _relations = asset.getRelations();
                    } catch (e) {
                        if (options.onError) {
                            options.onError(err, assetGraph, asset);
                            this(null, []);
                        } else {
                            this(e);
                        }
                        return;
                    }
                    this(null, _relations);
                })
                .flatten()
                .parEach(function (relation) {
                    var callback = this.into(relation.id);
                    assetGraph.resolveAssetConfig(relation.to, assetGraph.getBaseAssetForRelation(relation).url, function (err, resolvedAssetConfigs) {
                        if (err && options.onError) {
                            options.onError(err, assetGraph, asset, relation);
                            callback(null, null);
                        } else {
                            callback(err, resolvedAssetConfigs);
                        }
                    });
                })
                .parEach(function (relation) {
                    var resolvedAssetConfigs = this.vars[relation.id];
                    if (resolvedAssetConfigs === null) {
                        // Error already handled by options.onError, don't add relation to graph
                        return this();
                    }
                    assetGraph.multiplyRelationBasedOnResolvedAssetConfigs(relation, resolvedAssetConfigs).forEach(function (multipliedRelation) {
                        if (followRelationsMatcher(multipliedRelation)) {
                            if (multipliedRelation.to.url && multipliedRelation.to.url in assetGraph.urlIndex) {
                                multipliedRelation.to = assetGraph.urlIndex[multipliedRelation.to.url];
                            } else {
                                multipliedRelation.to = assets.create(multipliedRelation.to);
                                assetGraph.addAsset(multipliedRelation.to);
                                assetQueue.push(multipliedRelation.to);
                            }
                        }
                        if (lastSeenRelation) {
                            assetGraph.addRelation(multipliedRelation, 'after', lastSeenRelation);
                        } else {
                            assetGraph.addRelation(multipliedRelation, 'first');
                        }
                        lastSeenRelation = multipliedRelation;
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
