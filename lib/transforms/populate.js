var _ = require('lodash'),
    async = require('async'),
    passError = require('passerror'),
    query = require('../query');

module.exports = function (options) {
    options = options || {};
    var stopAssetsMatcher = function () {
        return false;
    };

    if (options.stopAssets) {
        stopAssetsMatcher = query.queryObjToMatcherFunction(options.stopAssets);
    }
    return function populate(assetGraph, cb) {
        var followRelationsMatcher = query.queryObjToMatcherFunction(options.followRelations || assetGraph.followRelations),
            assetQueue = assetGraph.findAssets(_.extend({isInline: false}, options.startAssets || options.from)),
            maxWaitingCallbacks = options.concurrency || 100,
            numWaitingCallbacks = 0,
            firstErrorOrNull = null;

        function processAsset(asset, cb) {
            asset.load(function (err) {
                if (err) {
                    err.message += '\nIncluding assets:\n    ' + asset.incomingRelations.map(function (incomingRelation) {
                        return incomingRelation.from.urlOrDescription;
                    }).join('\n    ') + '\n';
                    err.asset = asset;
                    assetGraph.emit('warn', err);
                    return cb();
                }
                var resolvedAssetConfigByOriginalRelationId = {};
                var externalRelations = asset.externalRelations;
                async.each(externalRelations, function (originalRelation, cb) {
                    originalRelation.resolve(function (err, resolvedAssetConfig) {
                        if (err) {
                            assetGraph.emit('warn', err);
                        } else {
                            resolvedAssetConfigByOriginalRelationId[originalRelation.id] = resolvedAssetConfig;
                        }
                        cb(null, originalRelation);
                    });
                }, passError(cb, function () {
                    async.eachLimit(externalRelations, 1, function (originalRelation, cb) {
                        var multipliedRelations = resolvedAssetConfigByOriginalRelationId[originalRelation.id] || [];
                        async.eachLimit(multipliedRelations, 1, function (multipliedRelation, cb) {
                            if (multipliedRelation.to.isResolved && followRelationsMatcher(multipliedRelation, assetGraph)) {
                                assetGraph.ensureAssetConfigHasType(multipliedRelation.to, function (err) {
                                    if (err) {
                                        err.message += '\nIncluding asset [' + multipliedRelation.type + ']: ' + multipliedRelation.from.nonInlineAncestor.url;
                                        err.asset = multipliedRelation.to;
                                        err.relation = multipliedRelation;
                                        assetGraph.emit('warn', err);
                                        return cb();
                                    }

                                    var targetAsset;
                                    if (multipliedRelation.to.url) {
                                        // See if the target asset is already in the graph by looking up its url:
                                        var targetAssets = assetGraph.findAssets({
                                            url: multipliedRelation.to.url
                                        });
                                        // If multiple assets share the url, prefer the one that was added last (should be customizable?):
                                        if (targetAssets.length) {
                                            targetAsset = targetAssets[targetAssets.length - 1];
                                        }
                                    }
                                    if (targetAsset) {
                                        multipliedRelation.to = targetAsset;
                                        multipliedRelation.refreshHref();
                                    } else {
                                        multipliedRelation.to = assetGraph.createAsset(multipliedRelation.to);
                                        assetGraph.addAsset(multipliedRelation.to);
                                        if (!stopAssetsMatcher(multipliedRelation.to)) {
                                            assetQueue.push(multipliedRelation.to);
                                        }
                                    }
                                    cb();
                                });
                            } else {
                                setImmediate(cb);
                            }
                        }, cb);
                    }, cb);
                }));
            });
        }

        (function proceed() {
            function processAssetCallback(err) {
                if (err && !firstErrorOrNull) {
                    firstErrorOrNull = err;
                }
                numWaitingCallbacks -= 1;
                proceed();
            }
            while (!firstErrorOrNull && assetQueue.length && numWaitingCallbacks < maxWaitingCallbacks) {
                numWaitingCallbacks += 1;
                processAsset(assetQueue.shift(), processAssetCallback);
            }
            if (numWaitingCallbacks === 0) {
                cb(firstErrorOrNull);
            }
        }());
    };
};
