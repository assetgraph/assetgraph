var _ = require('underscore'),
    passError = require('../util/passError'),
    assets = require('../assets');

// Takes assetConfigs, urls or root-relative paths or arrays of these
module.exports = function () { // ...
    var assetConfigs = _.flatten(arguments);
    return function loadAssets(assetGraph, cb) {
        assetGraph.resolveAssetConfig(assetConfigs, assetGraph.root, passError(cb, function (resolvedAssetConfigs) {
            if (!_.isArray(resolvedAssetConfigs)) {
                resolvedAssetConfigs = [resolvedAssetConfigs];
            }
            resolvedAssetConfigs.forEach(function (resolvedAssetConfig) {
                resolvedAssetConfig.isInitial = true;
                assetGraph.addAsset(assets.create(resolvedAssetConfig));
            });
            cb();
        }));
    };
};
