var _ = require('underscore'),
    seq = require('seq'),
    error = require('../util/error'),
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
                    asset.getOriginalRelations(this);
                })
                .flatten()
                .parEach(function (originalRelation) {
                    assetGraph.resolveAssetConfig(originalRelation.to, assetGraph.getBaseAssetForRelation(originalRelation).url, this.into(originalRelation.id));
                })
                .parEach(function (originalRelation) {
                    assetGraph.multiplyRelationBasedOnResolvedAssetConfigs(originalRelation, this.vars[originalRelation.id]).forEach(function (relation) {
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
