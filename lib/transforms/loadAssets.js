var _ = require('underscore'),
    passError = require('passerror'),
    seq = require('seq');

// Takes assetConfigs, urls or root-relative paths or arrays of these
module.exports = function () { // ...
    var assetConfigs = _.flatten(arguments);
    return function loadAssets(assetGraph, cb) {
        assetGraph.resolveAssetConfig(assetConfigs, assetGraph.root, passError(cb, function (resolvedAssetConfigs) {
            seq(_.isArray(resolvedAssetConfigs) ? resolvedAssetConfigs : [resolvedAssetConfigs])
                .parEach(function (resolvedAssetConfig) {
                    resolvedAssetConfig.isInitial = true;
                    assetGraph.ensureAssetConfigHasType(resolvedAssetConfig, this);
                })
                .parMap(10, function (resolvedAssetConfig) {
                    var callback = this,
                        asset = assetGraph.createAsset(resolvedAssetConfig);
                    if (asset.keepUnloaded) {
                        callback(null, asset);
                    } else {
                        asset.load(function (err) {
                            if (err) {
                                assetGraph.emit('error', err);
                                callback();
                            } else {
                                callback(null, asset);
                            }
                        });
                    }
                })
                .unflatten()
                .seq(function (_assets) {
                    // Make sure that parse errors and the like get propagated to cb:
                    try {
                        _assets.forEach(function (asset) {
                            if (asset) {
                                assetGraph.addAsset(asset);
                            }
                        });
                    } catch (e) {
                        return cb(e);
                    }
                    cb();
                })['catch'](cb);
        }));
    };
};
