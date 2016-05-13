var _ = require('lodash'),
    passError = require('passerror'),
    async = require('async');

// Takes assetConfigs, urls or root-relative paths or arrays of these
module.exports = function () { // ...
    var assetConfigs = _.flatten(arguments);
    return function loadAssets(assetGraph, cb) {
        assetGraph.resolveAssetConfig(assetConfigs, assetGraph.root, passError(cb, function (resolvedAssetConfigs) {
            async.each(_.isArray(resolvedAssetConfigs) ? resolvedAssetConfigs : [resolvedAssetConfigs], function (resolvedAssetConfig, cb) {
                resolvedAssetConfig.isInitial = true;
                assetGraph.ensureAssetConfigHasType(resolvedAssetConfig, passError(cb, function () {
                    var asset = assetGraph.createAsset(resolvedAssetConfig);
                    if (asset.keepUnloaded) {
                        cb();
                    } else {
                        asset.load(function (err) {
                            if (err) {
                                assetGraph.emit('warn', err);
                            } else {
                                assetGraph.addAsset(asset);
                            }
                            cb();
                        });
                    }
                }));
            }, cb);
        }));
    };
};
