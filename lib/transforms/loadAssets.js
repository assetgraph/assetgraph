var _ = require('underscore'),
    passError = require('../util/passError'),
    seq = require('seq'),
    assets = require('../assets');

// Takes assetConfigs, urls or root-relative paths or arrays of these
module.exports = function () { // ...
    var assetConfigs = _.flatten(arguments);
    return function loadAssets(assetGraph, cb) {
        assets.resolveConfig(assetConfigs, assetGraph.root, assetGraph, passError(cb, function (resolvedAssetConfigs) {
            seq(_.isArray(resolvedAssetConfigs) ? resolvedAssetConfigs : [resolvedAssetConfigs])
                .parEach(function (resolvedAssetConfig) {
                    resolvedAssetConfig.isInitial = true;
                    assets.ensureAssetConfigHasType(resolvedAssetConfig, this);
                })
                .parMap(function (resolvedAssetConfig) {
                    var callback = this,
                        asset = assets.create(resolvedAssetConfig);
                    asset.load(passError(callback, function () {
                        callback(null, asset);
                    }));
                })
                .unflatten()
                .seq(function (_assets) {
                    _assets.forEach(function (asset) {
                        assetGraph.addAsset(asset);
                    });
                    cb();
                })
                ['catch'](cb);
        }));
    };
};
