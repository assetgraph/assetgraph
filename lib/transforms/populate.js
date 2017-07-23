var query = require('../query');

module.exports = options => {
    options = options || {};
    var stopAssetsMatcher = function () {
        return false;
    };

    if (options.stopAssets) {
        stopAssetsMatcher = query.queryObjToMatcherFunction(options.stopAssets);
    }
    return async function populate(assetGraph) {
        const followRelationsMatcher = query.queryObjToMatcherFunction(options.followRelations || assetGraph.followRelations);
        const assetQueue = assetGraph.findAssets(Object.assign({isInline: false}, options.startAssets || options.from));
        let maxWaitingCallbacks = options.concurrency || 100;
        let numWaitingCallbacks = 0;
        let firstErrorOrNull = null;

        async function processAsset(asset) {
            try {
                await asset.load();
            } catch (err) {
                err.message = err.message || err.code || err.name;
                var includingAssetUrls = asset.incomingRelations.map(function (incomingRelation) {
                    return incomingRelation.from.urlOrDescription;
                });
                if (includingAssetUrls.length > 0) {
                    err.message += '\nIncluding assets:\n    ' + includingAssetUrls.join('\n    ') + '\n';
                }
                err.asset = asset;

                if (asset.incomingRelations.length > 0 && asset.incomingRelations.every(relation => /SourceMappingUrl$/.test(relation.type))) {
                    assetGraph.info(err);
                } else {
                    assetGraph.warn(err);
                }
                return;
            }
            for (const relation of asset.externalRelations) {
                try {
                    relation.to = assetGraph.createAsset(relation.to, relation.baseUrl);
                } catch (err) {
                    assetGraph.warn(err);
                }
                if (relation.to && followRelationsMatcher(relation, assetGraph)) {
                    if (!relation.to.assetGraph) {
                        assetGraph.addAsset(relation.to);
                        if (!stopAssetsMatcher(relation.to)) {
                            assetQueue.push(relation.to);
                        }
                    }
                }
            }
        }

        await (function proceed() {
            if (!firstErrorOrNull) {
                const promises = [];
                while (assetQueue.length > 0 && numWaitingCallbacks < maxWaitingCallbacks) {
                    numWaitingCallbacks += 1;
                    promises.push(processAsset(assetQueue.shift()).then(undefined, function (err) {
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
        if (firstErrorOrNull) {
            throw firstErrorOrNull;
        }
    };
};
