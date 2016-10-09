var _ = require('lodash');
var Promise = require('bluebird');
var query = require('../query');

module.exports = function (options) {
    options = options || {};
    var stopAssetsMatcher = function () {
        return false;
    };

    if (options.stopAssets) {
        stopAssetsMatcher = query.queryObjToMatcherFunction(options.stopAssets);
    }
    return function populate(assetGraph) {
        var followRelationsMatcher = query.queryObjToMatcherFunction(options.followRelations || assetGraph.followRelations),
            assetQueue = assetGraph.findAssets(_.extend({isInline: false}, options.startAssets || options.from)),
            maxWaitingCallbacks = options.concurrency || 100,
            numWaitingCallbacks = 0,
            firstErrorOrNull = null;

        function processAsset(asset) {
            return asset.load().then(function () {
                return Promise.map(asset.externalRelations, function (originalRelation) {
                    var resolvedAssetConfig;
                    try {
                        resolvedAssetConfig = originalRelation.resolve();
                    } catch (err) {
                        assetGraph.emit('warn', err);
                    }
                    if (resolvedAssetConfig && resolvedAssetConfig.to.isResolved && followRelationsMatcher(resolvedAssetConfig, assetGraph)) {
                        return assetGraph.ensureAssetConfigHasType(resolvedAssetConfig.to).then(function () {
                            var targetAsset;
                            if (resolvedAssetConfig.to.url) {
                                // See if the target asset is already in the graph by looking up its url:
                                var targetAssets = assetGraph.findAssets({
                                    url: resolvedAssetConfig.to.url
                                });
                                // If multiple assets share the url, prefer the one that was added last (should be customizable?):
                                if (targetAssets.length) {
                                    targetAsset = targetAssets[targetAssets.length - 1];
                                }
                            }
                            if (targetAsset) {
                                resolvedAssetConfig.to = targetAsset;
                                resolvedAssetConfig.refreshHref();
                            } else {
                                resolvedAssetConfig.to = assetGraph.createAsset(resolvedAssetConfig.to);
                                assetGraph.addAsset(resolvedAssetConfig.to);
                                if (!stopAssetsMatcher(resolvedAssetConfig.to)) {
                                    assetQueue.push(resolvedAssetConfig.to);
                                }
                            }
                        }).caught(function (err) {
                            err.message = err.message || err.code || err.name;
                            err.message += '\nIncluding asset [' + resolvedAssetConfig.type + ']: ' + resolvedAssetConfig.from.nonInlineAncestor.url;
                            err.asset = resolvedAssetConfig.to;
                            err.relation = resolvedAssetConfig;
                            assetGraph.emit('warn', err);
                        });
                    }
                });
            }, function (err) {
                err.message = err.message || err.code || err.name;
                err.message += '\nIncluding assets:\n    ' + asset.incomingRelations.map(function (incomingRelation) {
                    return incomingRelation.from.urlOrDescription;
                }).join('\n    ') + '\n';
                err.asset = asset;
                assetGraph.emit('warn', err);
            });
        }

        return (function proceed() {
            if (!firstErrorOrNull) {
                var promises = [];
                while (assetQueue.length && numWaitingCallbacks < maxWaitingCallbacks) {
                    numWaitingCallbacks += 1;
                    promises.push(processAsset(assetQueue.shift()).caught(function (err) {
                        firstErrorOrNull = firstErrorOrNull || err;
                    }));
                }
                if (promises.length > 0) {
                    return Promise.all(promises).then(function () {
                        numWaitingCallbacks -= promises.length;
                        return proceed();
                    });
                }
            }
        }());
    };
};
