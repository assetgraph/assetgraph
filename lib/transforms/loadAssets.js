var _ = require('lodash');
var Promise = require('bluebird');
var urlTools = require('urltools');
var glob = require('glob');
var pathModule = require('path');

// Takes assetConfigs, urls or root-relative paths or arrays of these
module.exports = function () { // ...
    var flattenedArguments = _.flatten(arguments);
    return async function loadAssets(assetGraph) {
        const assetConfigs = await Promise.map(flattenedArguments, async assetConfig => {
            if (typeof assetConfig === 'string' && !/^[a-zA-Z-\+]+:/.test(assetConfig) && assetConfig.indexOf('*') !== -1) {
                assetConfig = pathModule.resolve(assetGraph.root ? urlTools.fileUrlToFsPath(assetGraph.root) : process.cwd(), assetConfig);
                return (await Promise.fromNode(cb => glob(assetConfig, cb)))
                    .map(path => encodeURI('file://' + path));
            } else {
                return assetConfig;
            }
        });

        await Promise.map(_.flatten(assetConfigs), async assetConfig => {
            if (typeof assetConfig === 'string') {
                assetConfig = { url: assetConfig };
            }
            if (typeof assetConfig.isInitial === 'undefined') {
                assetConfig.isInitial = true;
            }
            try {
                await assetGraph.addAsset(assetConfig).load();
            } catch (err) {
                assetGraph.warn(err);
            }
        }, { concurrency: 10 });
    };
};
