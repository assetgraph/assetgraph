var _ = require('lodash'),
    passError = require('passerror'),
    async = require('async');

// Takes assetConfigs, urls or root-relative paths or arrays of these
module.exports = function () { // ...
    var assetConfigs = _.flatten(arguments);
    return function loadAssets(assetGraph, cb) {
        assetGraph.resolveAssetConfig(assetConfigs, assetGraph.root, passError(cb, function (resolvedAssetConfigs) {
            async.map(_.isArray(resolvedAssetConfigs) ? resolvedAssetConfigs : [resolvedAssetConfigs], function (resolvedAssetConfig, cb) {
                resolvedAssetConfig.isInitial = true;
                assetGraph.ensureAssetConfigHasType(resolvedAssetConfig, passError(cb, function () {
                    cb(null, assetGraph.createAsset(resolvedAssetConfig));
                }));
            }, passError(cb, function (assets) {
                var assetsToLoad = [];
                assets.forEach(function (asset) {
                    if (asset.keepUnpopulated) {
                        assetGraph.addAsset(asset);
                    } else {
                        assetsToLoad.push(asset);
                    }
                });
                async.eachLimit(assetsToLoad, 10, function (asset, cb) {
                    asset.load(function (err) {
                        if (err) {
                            assetGraph.emit('warn', err);
                        } else {
                            // Make sure that parse errors and the like get propagated to cb:
                            try {
                                assetGraph.addAsset(asset);
                            } catch (e) {
                                return cb(e);
                            }
                        }
                        cb();
                    });
                }, cb);
            }));
        }));
    };
};
