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
                if (typeof assetConfig === 'string') {
                    assetConfig = { url: assetConfig };
                }
                if (typeof assetConfig.isInitial === 'undefined') {
                    assetConfig.isInitial = true;
                }
                return assetGraph.addAsset(assetConfig).load()
                .catch(function (err) {
                    assetGraph.emit('warn', err);
                });
            }, { concurrency: 10 });
        });
    };
};
