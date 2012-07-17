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
                .parMap(10, function (resolvedAssetConfig) {
                    var callback = this,
                        asset = assets.create(resolvedAssetConfig);
                    if (asset.keepUnloaded) {
                        callback(null, asset);
                    } else {
                        asset.load(passError(callback, function () {
                            callback(null, asset);
                        }));
                    }
                })
                .unflatten()
                .seq(function (_assets) {
                    // Make sure that parse errors and the like get propagated to cb:
                    try {
                        _assets.forEach(function (asset) {
                            assetGraph.addAsset(asset);
                        });
                    } catch (e) {
                        return cb(e);
                    }
                    cb();
                })
                ['catch'](cb);
        }));
    };
};
