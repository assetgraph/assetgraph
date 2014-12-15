var assetMover = require('../util/assetMover');

module.exports = function (queryObj, newUrlFunctionOrString) {
    return function moveAssets(assetGraph) {
        assetGraph.findAssets(queryObj).forEach(assetMover(newUrlFunctionOrString, assetGraph));
    };
};
