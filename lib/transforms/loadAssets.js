const _ = require('lodash');
const { promisify } = require('util');
const Bluebird = require('bluebird');
const pathModule = require('path');
const glob = promisify(require('glob'));
const urlTools = require('urltools');

// Takes assetConfigs, urls or root-relative paths or arrays of these
module.exports = function(...args) {
  // ...
  const flattenedArguments = _.flatten(args);
  return async function loadAssets(assetGraph) {
    return _.flatten(
      await Bluebird.map(
        _.flatten(flattenedArguments),
        async assetConfig => {
          let assets;
          try {
            if (
              typeof assetConfig === 'string' &&
              assetConfig.includes('*') &&
              (!/^[a-zA-Z-+]+:/.test(assetConfig) ||
                /^file:/i.test(assetConfig))
            ) {
              if (/^file:/.test(assetConfig)) {
                assetConfig = urlTools.fileUrlToFsPath(assetConfig);
              }
              assets = _.flatten(
                await glob(
                  pathModule.resolve(
                    assetGraph.root
                      ? urlTools.fileUrlToFsPath(assetGraph.root)
                      : process.cwd(),
                    assetConfig
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
