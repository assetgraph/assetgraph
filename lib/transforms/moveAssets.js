const createAssetMover = require('../util/assetMover');

module.exports = (queryObj, newUrlFunctionOrString) => {
    return function moveAssets(assetGraph) {
        const assetMover = createAssetMover(newUrlFunctionOrString, assetGraph);
        for (const asset of assetGraph.findAssets(queryObj)) {
            assetMover(asset);
        }
    };
};
