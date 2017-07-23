const _ = require('lodash');
const Promise = require('bluebird');

// Takes assetConfigs, urls or root-relative paths or arrays of these
module.exports = function () { // ...
    var flattenedArguments = _.flatten(arguments);
    return async function loadAssets(assetGraph) {
        await Promise.map(_.flatten(flattenedArguments), async assetConfig => {
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
