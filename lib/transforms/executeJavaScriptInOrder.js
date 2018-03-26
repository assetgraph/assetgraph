const vm = require('vm');

module.exports = context => {
  return function executeJavaScriptInOrder(assetGraph) {
    const assets = assetGraph.findAssets();
    if (assets.length > 1) {
      throw new Error(
        'executeJavaScriptInOrder: The selection must contain a maximum of one Html asset'
      );
    }
    if (!context) {
      context = vm.createContext();
    }
    const assetsInOrder = [];
    for (const initialAsset of assets) {
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
          'transforms.executeJavaScriptInOrder: Error in ' +
            (asset.url || '(inline script)') +
            ':\n' +
            e.stack
        );
      }
    }
  };
};
