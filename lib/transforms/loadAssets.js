var _ = require('underscore'),
    error = require('../error'),
    assets = require('../assets');

// Takes assetConfigs, urls or root-relative paths or arrays of these
exports.loadAssets = function () { // ...
    var assetConfigs = _.flatten(arguments);
    return function loadAssets(assetGraph, cb) {
        assetGraph.resolveAssetConfig(assetConfigs, assetGraph.root, error.passToFunction(cb, function (resolvedAssetConfigs) {
            if (!_.isArray(resolvedAssetConfigs)) {
                resolvedAssetConfigs = [resolvedAssetConfigs];
            }
            resolvedAssetConfigs.forEach(function (resolvedAssetConfig) {
                resolvedAssetConfig.isInitial = true;
                if (!resolvedAssetConfig.type) {
                    throw new Error("Cannot work out asset type: " + require('sys').inspect(resolvedAssetConfig));
                }
                assetGraph.addAsset(new assets[resolvedAssetConfig.type](resolvedAssetConfig));
            });
            cb();
        }));
    };
};
