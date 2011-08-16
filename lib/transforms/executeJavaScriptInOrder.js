var vm = require('vm');

// Only really makes sense when queryObj matches a single initial asset.
module.exports = function (queryObj, context) {
    return function executeJavaScriptInOrder(assetGraph) {
        if (!context) {
            context = vm.createContext();
        }
        var assetsInOrder = [];
        assetGraph.findAssets(queryObj).forEach(function (initialAsset) {
            Array.prototype.push.apply(assetsInOrder, assetGraph.collectAssetsPostOrder(initialAsset, {to: {type: 'JavaScript'}}));
        });
        assetsInOrder.forEach(function (asset) {
            vm.runInContext(asset.text, context, asset.url || '(inline)');
        });
    };
};
