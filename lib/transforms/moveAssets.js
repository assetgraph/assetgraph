const createAssetMover = require('../util/assetMover');

module.exports = newUrlFunctionOrString => {
  if (!['string', 'function'].includes(typeof newUrlFunctionOrString)) {
    throw new Error('The second parameter must be a function or a string');
  }
  return function moveAssets(assetGraph) {
    const assetMover = createAssetMover(newUrlFunctionOrString, assetGraph);
    for (const asset of assetGraph.findAssets()) {
      assetMover(asset);
    }
  };
};
