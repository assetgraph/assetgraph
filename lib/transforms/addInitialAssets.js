var _ = require('underscore');

exports.addInitialAssets = function (assetConfigs) {
    return function addInitialAssets(siteGraph, cb) {
        if (!_.isArray(assetConfigs)) {
            assetConfigs = [assetConfigs];
        }
        assetConfigs.forEach(function (assetConfig) {
            siteGraph.registerAsset(assetConfig, true);
        });
        process.nextTick(cb);
    };
};
