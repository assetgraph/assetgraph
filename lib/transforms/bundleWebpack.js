var pathModule = require('path');
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var urlTools = require('urltools');

module.exports = function (queryObj, options) {
    options = options || {};
    return function (assetGraph) {
        var webpack;
        try {
            webpack = require('webpack');
        } catch (e) {}

        var configPath = options.configPath || pathModule.resolve(urlTools.fileUrlToFsPath(assetGraph.root), 'webpack.config.js');

        var config;
        try {
            config = require(configPath);
        } catch (err) {
            if (typeof options.configPath === 'undefined') {
                if (webpack) {
                    assetGraph.emit('warn', new Error('Could not load webpack config ' + configPath + ', but webpack is installed: ' + err.message));
                }
                return;
            } else {
                err.message = 'Could not load webpack config ' + options.configPath + ': ' + err.message;
                throw err;
            }
        }
        config.context = config.context || urlTools.fileUrlToFsPath(assetGraph.root);
        if (config.output && typeof config.output.path === 'string') {
            config.output.path = pathModule.resolve(config.context, config.output.path);
        }
        var compiler = webpack(config);
        return Promise.fromNode(function (cb) {
            compiler.run(cb);
        }).then(function (stats) {
            var existingAssetsWereReplaced;
            stats.toJson({assets: true}).assets.forEach(function (asset) {
                var url = urlTools.fsFilePathToFileUrl(pathModule.resolve(config.output.path, asset.name));
                var existingAsset = assetGraph.findAssets({url: url})[0];
                if (existingAsset) {
                    assetGraph.emit('info', new Error('Replacing previously built artifact: ' + url));
                    existingAssetsWereReplaced = true;
                    existingAsset.incomingRelations.forEach(function (relation) {
                        relation.to = {url: url};
                    });
                    assetGraph.removeAsset(existingAsset);
                }
            });
            assetGraph.emit('info', stats.toString({colors: true}));
            if (existingAssetsWereReplaced) {
                assetGraph.emit('info', new Error('Please remove ' + config.output.path + ' before building with assetgraph to speed up the process'));
            }
        });
    };
};
