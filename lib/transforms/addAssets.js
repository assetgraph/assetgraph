var _ = require('underscore');

exports.addAssets = function (assetConfigs) {
    return function addAssets(assetGraph, cb) {
        if (!_.isArray(assetConfigs)) {
            assetConfigs = [assetConfigs];
        }
        assetConfigs.forEach(function (assetConfig) {
            assetGraph.registerAsset(assetConfig, true);
        });
        process.nextTick(cb);
    };
};
