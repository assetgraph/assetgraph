const _ = require('lodash');
const Promise = require('bluebird');

// Takes assetConfigs, urls or root-relative paths or arrays of these
module.exports = function () { // ...
    var flattenedArguments = _.flatten(arguments);
    return async function loadAssets(assetGraph) {
        await Promise.map(_.flatten(flattenedArguments), async assetConfig => {
            try {
                for (const asset of assetGraph.addAsset(assetConfig)) {
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
