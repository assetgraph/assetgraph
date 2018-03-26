const _ = require('lodash');

module.exports = (properties, options) => {
  if (typeof options === 'boolean') {
    options = { deep: options };
  } else {
    options = options || {};
  }

  return function updateAssets(assetGraph) {
    for (const asset of assetGraph.findAssets()) {
      if (options.deep) {
        _.merge(asset, properties);
      } else {
        Object.assign(asset, properties);
      }
      if (properties.serializationOptions) {
        asset.markDirty();
      }
    }
  };
};
