var _ = require('underscore'),
    seq = require('seq'),
    assets = require('../assets'),
    query = require('../query');

module.exports = function (options) {
    options = options || {};
    var followRelationsMatcher = query.queryObjToMatcherFunction(options.followRelations);
    return function populate(assetGraph, cb) {
        var assetQueue = assetGraph.findAssets(_.extend({isInline: false}, options.from)),
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

        function passErrorToOnErrorOrFail(callback, err, asset, relation) {
            if (options.onError) {
                options.onError(err, assetGraph, asset, relation);
                callback();
            } else {
                callback(err);
            }
        }

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
                            return passErrorToOnErrorOrFail(cb, err, asset);
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
                    originalRelation.resolve(this.into(originalRelation.id));
                })
                .parEach(function (originalRelation) {
                    if (options.ensureType) {
                        assets.ensureAssetConfigHasType(originalRelation.to, this);
                    } else {
                        this();
                    }
                })
                .seqEach(function (originalRelation) {
                    var callback = this;
                    seq(this.vars[originalRelation.id])
                        .seqEach(function (multipliedRelation) {
                            if (followRelationsMatcher(multipliedRelation)) {
                                assets.ensureAssetConfigHasType(multipliedRelation.to, function (err) {
                                    if (err) {
                                        err.message += '\nIncluding asset [' + multipliedRelation.type + ']: ' + multipliedRelation.from.nonInlineAncestor.url;
                                        return passErrorToOnErrorOrFail(this, err, multipliedRelation.to, multipliedRelation);
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
                                        multipliedRelation.to = assets.create(multipliedRelation.to);
                                        try {
                                            assetGraph.addAsset(multipliedRelation.to);
                                        } catch (e) {
                                            return passErrorToOnErrorOrFail(this, e, multipliedRelation.to, multipliedRelation);
                                        }
                                        assetQueue.push(multipliedRelation.to);
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
