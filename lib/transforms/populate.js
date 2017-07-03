var Promise = require('bluebird');
var query = require('../query');

module.exports = options => {
    options = options || {};
    var stopAssetsMatcher = function () {
        return false;
    };

    if (options.stopAssets) {
        stopAssetsMatcher = query.queryObjToMatcherFunction(options.stopAssets);
    }
    return function populate(assetGraph) {
        var followRelationsMatcher = query.queryObjToMatcherFunction(options.followRelations || assetGraph.followRelations),
            assetQueue = assetGraph.findAssets(Object.assign({isInline: false}, options.startAssets || options.from)),
            maxWaitingCallbacks = options.concurrency || 100,
            numWaitingCallbacks = 0,
            firstErrorOrNull = null;

        function processAsset(asset) {
            var nonInlineAncestor = asset.nonInlineAncestor;
            return asset.load().then(function () {
                return Promise.map(asset.externalRelations, function (relation) {
                    try {
                        relation.to = assetGraph.createAsset(relation.to, nonInlineAncestor && nonInlineAncestor.url);
                    } catch (err) {
                        assetGraph.emit('warn', err);
                    }
                    if (relation.to && followRelationsMatcher(relation.to, assetGraph)) {
                        if (!relation.to.assetGraph) {
                            assetGraph.addAsset(relation.to);
                        }
                        if (!stopAssetsMatcher(relation.to)) {
                            assetQueue.push(relation.to);
                        }
                    }
                });
            }, function (err) {
                err.message = err.message || err.code || err.name;
                var includingAssetUrls = asset.incomingRelations.map(function (incomingRelation) {
                    return incomingRelation.from.urlOrDescription;
                });
                if (includingAssetUrls.length > 0) {
                    err.message += '\nIncluding assets:\n    ' + includingAssetUrls.join('\n    ') + '\n';
                }
                err.asset = asset;

                if (asset.incomingRelations.length > 0 && asset.incomingRelations.every(relation => /SourceMappingUrl$/.test(relation.type))) {
                    assetGraph.emit('info', err);
                } else {
                    assetGraph.emit('warn', err);
                }
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
