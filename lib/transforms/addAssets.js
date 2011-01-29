var _ = require('underscore');

exports.addAssets = function (assetConfigs) {
    return function addAssets(siteGraph, cb) {
        if (!_.isArray(assetConfigs)) {
            assetConfigs = [assetConfigs];
        }
        assetConfigs.forEach(function (assetConfig) {
            siteGraph.registerAsset(assetConfig, true);
        });
        process.nextTick(cb);
    };
};
