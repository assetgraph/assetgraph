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
