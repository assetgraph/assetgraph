var _ = require('underscore');

module.exports = function (queryObj, properties) {
    return function updateAssets(assetGraph) {
        assetGraph.findAssets(queryObj).forEach(function (asset) {
            _.extend(asset, properties);
        });
    };
};
