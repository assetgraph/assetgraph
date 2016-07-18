var _ = require('lodash');
var Promise = require('bluebird');
var urlTools = require('urltools');
var glob = require('glob');
var pathModule = require('path');

// Takes assetConfigs, urls or root-relative paths or arrays of these
module.exports = function () { // ...
    var assetConfigs = _.flatten(arguments);
    return function loadAssets(assetGraph) {
        return Promise.map(assetConfigs, function (assetConfig) {
            if (typeof assetConfig === 'string' && !/^[a-zA-Z-\+]+:/.test(assetConfig) && assetConfig.indexOf('*') !== -1) {
                assetConfig = pathModule.resolve(assetGraph.root ? urlTools.fileUrlToFsPath(assetGraph.root) : process.cwd(), assetConfig);
                return Promise.fromNode(function (cb) {
                    glob(assetConfig, cb);
                }).then(function (files) {
                    return files.map(function (path) {
                        return encodeURI('file://' + path);
                    });
                });
            } else {
                return assetConfig;
            }
        }).then(function (assetConfigs) {
            return Promise.map(_.flatten(assetConfigs), function (assetConfig) {
                var resolvedAssetConfig = assetGraph.resolveAssetConfig(assetConfig, assetGraph.root);
                resolvedAssetConfig.isInitial = true;
                return assetGraph.ensureAssetConfigHasType(resolvedAssetConfig);
            });
        }).then(function (resolvedAssetConfigs) {
            return Promise.map(resolvedAssetConfigs, function (resolvedAssetConfig) {
                var asset = assetGraph.createAsset(resolvedAssetConfig);
                if (asset.keepUnloaded) {
                    return asset;
                } else {
                    return asset.load().catch(function (err) {
                        assetGraph.emit('warn', err);
                        return asset;
                    });
                }
            }, {concurrency: 10});
        }).then(function (assets) {
            assets.forEach(function (asset) {
                if (asset) {
                    assetGraph.addAsset(asset);
                }
            });
        });
    };
};
