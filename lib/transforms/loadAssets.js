var _ = require('underscore'),
    passError = require('../util/passError'),
    seq = require('seq'),
    assets = require('../assets');

// Takes assetConfigs, urls or root-relative paths or arrays of these
module.exports = function () { // ...
    var assetConfigs = _.flatten(arguments);
    return function loadAssets(assetGraph, cb) {
        assetGraph.resolveAssetConfig(assetConfigs, assetGraph.root, passError(cb, function (resolvedAssetConfigs) {
            if (!_.isArray(resolvedAssetConfigs)) {
                resolvedAssetConfigs = [resolvedAssetConfigs];
            }
            var _assets = resolvedAssetConfigs.map(function (resolvedAssetConfig) {
                resolvedAssetConfig.isInitial = true;
                return assets.create(resolvedAssetConfig);
            });
            seq(_assets)
                .parEach(function (asset) {
                    asset.load(this);
                })
                .seq(function () {
                    _assets.forEach(function (asset) {
                        assetGraph.addAsset(asset);
                    });
                    cb();
                })
                ['catch'](cb);
        }));
    };
};
