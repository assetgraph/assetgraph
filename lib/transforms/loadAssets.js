var _ = require('lodash'),
    seq = require('seq'),
    passError = require('passerror'),
    urlTools = require('urltools'),
    glob = require('glob'),
    pathModule = require('path');

// Takes assetConfigs, urls or root-relative paths or arrays of these
module.exports = function () { // ...
    var assetConfigs = _.flatten(arguments);
    return function loadAssets(assetGraph, cb) {
        seq(assetConfigs)
            .parMap(function (assetConfig) {
                if (typeof assetConfig === 'string' && !/^[a-zA-Z-\+]+:/.test(assetConfig) && assetConfig.indexOf('*') !== -1) {
                    var callback = this;
                    assetConfig = pathModule.resolve(assetGraph.root ? urlTools.fileUrlToFsPath(assetGraph.root) : process.cwd(), assetConfig);
                    glob(assetConfig, passError(callback, function (files) {
                        callback(null, files.map(function (path) {
                            return encodeURI('file://' + path);
                        }));
                    }));
                } else {
                    this(null, assetConfig);
                }
            })
            .flatten()
            .parMap(function (assetConfig) {
                var resolvedAssetConfig = assetGraph.resolveAssetConfig(assetConfig, assetGraph.root);
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
                            assetGraph.emit('warn', err);
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
            })
            .catch(cb);
    };
};
