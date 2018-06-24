const vm = require('vm');

// Only really makes sense when queryObj matches a single initial asset.
module.exports = (queryObj, context) => {
  if (typeof queryObj === 'undefined') {
    throw new Error(
      'executeJavaScriptInOrder: The queryObj parameter is mandatory.'
    );
  }
  return function executeJavaScriptInOrder(assetGraph) {
    if (!context) {
      context = vm.createContext();
    }
    const assetsInOrder = [];
    for (const initialAsset of assetGraph.findAssets(queryObj)) {
      assetsInOrder.push(
        ...assetGraph.collectAssetsPostOrder(initialAsset, {
          to: { type: 'JavaScript' }
        })
      );
    }
    for (const asset of assetsInOrder) {
      try {
        vm.runInContext(asset.text, context, asset.url || '(inline)');
      } catch (e) {
        // Script.runInContext won't report the file name on error until node.js 0.5.5:
        // https://github.com/joyent/node/commit/c05936ca13681059c7aeecfe3a608e4e1afa800a
        throw new Error(
          `transforms.executeJavaScriptInOrder: Error in ${asset.url ||
            '(inline script)'}:\n${e.stack}`
        );
      }
    }
  };
};
