const _ = require('lodash');
const Promise = require('bluebird');
const pathModule = require('path');
const glob = require('glob');
const urlTools = require('urltools');

// Takes assetConfigs, urls or root-relative paths or arrays of these
module.exports = function () { // ...
    var flattenedArguments = _.flatten(arguments);
    return async function loadAssets(assetGraph) {
        await Promise.map(_.flatten(flattenedArguments), async assetConfig => {
            try {
                let assets;
                if (typeof assetConfig === 'string' && !/^[a-zA-Z-\+]+:/.test(assetConfig) && assetConfig.includes('*')) {
                    assets = _.flatten(glob
                        .sync(pathModule.resolve(assetGraph.root ? urlTools.fileUrlToFsPath(assetGraph.root) : process.cwd(), assetConfig))
                        .map(path => assetGraph.addAsset(encodeURI(`file://${path}`))));
                } else {
                    assets = [ assetGraph.addAsset(assetConfig) ];
                }

                for (const asset of assets) {
                    await asset.load();
                    if (typeof asset.isInitial === 'undefined') {
                        asset.isInitial = true;
                    }
                }
            } catch (err) {
                assetGraph.warn(err);
            }
        }, { concurrency: 10 });
    };
};
