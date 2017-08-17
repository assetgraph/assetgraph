const query = require('../query');

module.exports = options => {
    options = options || {};
    let stopAssetsMatcher = () => false;

    if (options.stopAssets) {
        stopAssetsMatcher = query.queryObjToMatcherFunction(options.stopAssets);
    }
    return async function populate(assetGraph) {
        const followRelationsMatcher = query.queryObjToMatcherFunction(options.followRelations || assetGraph.followRelations);
        const assetQueue = assetGraph.findAssets(Object.assign({isInline: false, isLoaded: true}, options.startAssets || options.from));
        let maxWaitingCallbacks = options.concurrency || 100;
        const seenAssets = new Set();

        async function processAsset(asset) {
            if (seenAssets.has(asset)) {
                return;
            }
            seenAssets.add(asset);
            try {
                await asset.loadAsync();
            } catch (err) {
                if (asset.incomingRelations.length > 0 && asset.incomingRelations.every(relation => /SourceMappingUrl$/.test(relation.type))) {
                    assetGraph.info(err);
                } else {
                    assetGraph.warn(err);
                }
                return;
            }
            for (const relation of asset.externalRelations) {
                if (relation.to && followRelationsMatcher(relation, assetGraph)) {
                    if (!stopAssetsMatcher(relation.to)) {
                        assetQueue.push(relation.to);
                    }
                }
            }
        }

        while (assetQueue.length > 0) {
            await Promise.all(assetQueue.splice(0, maxWaitingCallbacks).map(processAsset));
        }
    };
};
