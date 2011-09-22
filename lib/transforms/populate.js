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
                                return cb();
                            } else {
                                return cb(err);
                            }
                        }
                        var externalRelations = [];
                        (function gatherExternalRelations(asset) {
                            asset.outgoingRelations.forEach(function (outgoingRelation) {
                                 if (outgoingRelation.to.isInline) {
                                     Array.prototype.push.apply(externalRelations, gatherExternalRelations(outgoingRelation.to));
                                 } else {
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
                                assets.ensureAssetConfigHasType(multipliedRelation.to, function () {
                                    if (multipliedRelation.to.url && multipliedRelation.to.url in assetGraph.urlIndex) {
                                        multipliedRelation.to = assetGraph.urlIndex[multipliedRelation.to.url];
                                        multipliedRelation.refreshHref();
                                    } else {
                                        multipliedRelation.to = assets.create(multipliedRelation.to);
                                        assetGraph.addAsset(multipliedRelation.to);
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
                        ['catch'](callback);
                })
                .seq(function () {
                    cb();
                })
                ['catch'](cb);
        }
    };
};
