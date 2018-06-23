const _ = require('lodash');
const Promise = require('bluebird');
const pathModule = require('path');
const glob = require('glob');
const urlTools = require('urltools');

// Takes assetConfigs, urls or root-relative paths or arrays of these
module.exports = function(...args) {
  // ...
  const flattenedArguments = _.flatten(args);
  return async function loadAssets(assetGraph) {
    return _.flatten(
      await Promise.map(
        _.flatten(flattenedArguments),
        async assetConfig => {
          let assets;
          try {
            if (
              typeof assetConfig === 'string' &&
              !/^[a-zA-Z-+]+:/.test(assetConfig) &&
              assetConfig.includes('*')
            ) {
              assets = _.flatten(
                await Promise.fromNode(cb =>
                  glob(
                    pathModule.resolve(
                      assetGraph.root
                        ? urlTools.fileUrlToFsPath(assetGraph.root)
                        : process.cwd(),
                      assetConfig
                    ),
                    cb
                  )
                )
              ).map(path => assetGraph.addAsset(encodeURI(`file://${path}`)));
            } else {
              assets = [assetGraph.addAsset(assetConfig)];
            }

            for (const asset of assets) {
              if (typeof asset.isInitial === 'undefined') {
                asset.isInitial = true;
              }
              await asset.load();
            }
          } catch (err) {
            assetGraph.warn(err);
          }
          return assets;
        },
        { concurrency: 10 }
      )
    );
  };
};
