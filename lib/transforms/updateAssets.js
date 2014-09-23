var _ = require('underscore'),
    deepExtend = require('deep-extend');

module.exports = function (queryObj, properties, deep) {
    return function updateAssets(assetGraph) {
        assetGraph.findAssets(queryObj).forEach(function (asset) {
            if (deep) {
                deepExtend(asset, properties);
            } else {
                _.extend(asset, properties);
            }
        });
    };
};
