var _ = require('underscore'),
    seq = require('seq'),
    query = require('../query');

module.exports = function (options) {
    options = options || {};
    var followRelationsMatcher = query.queryObjToMatcherFunction(options.followRelations),
        stopAssetsMatcher = function () {return false;};
    if (options.stopAssets) {
        stopAssetsMatcher = query.queryObjToMatcherFunction(options.stopAssets);
    }
    return function populate(assetGraph, cb) {
        var assetQueue = assetGraph.findAssets(_.extend({isInline: false}, options.startAssets || options.from)),
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
                            err.message += '\nIncluding assets:\n    ' + asset.incomingRelations.map(function (incomingRelation) {
                                return incomingRelation.from.nonInlineAncestor.url;
                            }).join('\n    ') + '\n';
                            err.asset = asset;
                            assetGraph.emit('warn', err);
                            return cb();
                        }
                        var externalRelations = [];
                        (function gatherExternalRelations(asset) {
                            asset.outgoingRelations.forEach(function (outgoingRelation) {
                                 if (outgoingRelation.to.isInline) {
                                     gatherExternalRelations(outgoingRelation.to);
                                 } else if (!outgoingRelation.to.isAsset) {
                                     externalRelations.push(outgoingRelation);
                                 }
                            });
                        }(asset));
                        callback(null, externalRelations);
                    });
                })
                .flatten()
                .parEach(function (originalRelation) {
                    originalRelation.resolve(function (err, resolvedAssetConfig) {
                        if (!err) {
                            this.vars[originalRelation.id] = resolvedAssetConfig;
                        }
                        this();
                    }.bind(this));
                })
                .seqEach(function (originalRelation) {
                    var callback = this,
                        multipliedRelations = this.vars[originalRelation.id] || [];
                    seq(multipliedRelations)
                        .seqEach(function (multipliedRelation) {
                            if (followRelationsMatcher(multipliedRelation, assetGraph)) {
                                assetGraph.ensureAssetConfigHasType(multipliedRelation.to, function (err) {
                                    if (err) {
                                        err.message += '\nIncluding asset [' + multipliedRelation.type + ']: ' + multipliedRelation.from.nonInlineAncestor.url;
                                        err.asset = multipliedRelation.to;
                                        err.relation = multipliedRelation;
                                        assetGraph.emit('warn', err);
                                        return this();
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
                                    this();
                                }.bind(this));
                            } else {
                                process.nextTick(this);
                            }
                        })
                        .seq(function () {
                            callback();
                        })
                        ['catch'](cb);
                })
                .seq(function () {
                    cb();
                })
                ['catch'](cb);
        }
    };
};
