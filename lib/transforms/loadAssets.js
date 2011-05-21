var _ = require('underscore'),
    error = require('../util/error'),
    assets = require('../assets');

// Takes assetConfigs, urls or root-relative paths or arrays of these
module.exports = function () { // ...
    var assetConfigs = _.flatten(arguments);
    return function loadAssets(assetGraph, cb) {
        assetGraph.resolver.resolve(assetConfigs, assetGraph.resolver.root, error.passToFunction(cb, function (resolvedAssetConfigs) {
            if (!_.isArray(resolvedAssetConfigs)) {
                resolvedAssetConfigs = [resolvedAssetConfigs];
            }
            resolvedAssetConfigs.forEach(function (resolvedAssetConfig) {
                resolvedAssetConfig.isInitial = true;
                if (!resolvedAssetConfig.type) {
                    throw new Error("Cannot work out asset type: " + require('sys').inspect(resolvedAssetConfig));
                }
                assetGraph.addAsset(assets.create(resolvedAssetConfig));
            });
            cb();
        }));
    };
};
