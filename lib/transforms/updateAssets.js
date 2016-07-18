var _ = require('lodash');

module.exports = function (queryObj, properties, options) {
    if (typeof options === 'boolean') {
        options = { deep: options };
    } else {
        options = options || {};
    }

    return function updateAssets(assetGraph) {
        assetGraph.findAssets(queryObj).forEach(function (asset) {
            if (options.deep) {
                _.merge(asset, properties);
            } else {
                _.extend(asset, properties);
            }
            if (properties.serializationOptions) {
                asset.markDirty();
            }
        });
    };
};
