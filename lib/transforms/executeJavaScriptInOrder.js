var vm = require('vm'),
    seq = require('seq'),
    traversal = require('../traversal');

// Only really makes sense when queryObj matches a single initial asset.
module.exports = function (queryObj, context) {
    return function executeJavaScriptInOrder(assetGraph, cb) {
        if (!context) {
            context = vm.createContext();
        }
        var assetsInOrder = [];
        assetGraph.findAssets(queryObj).forEach(function (initialAsset) {
            Array.prototype.push.apply(assetsInOrder, traversal.collectAssetsPostOrder(assetGraph, initialAsset, {to: {type: 'JavaScript'}}));
        });
        seq(assetsInOrder)
            .parEach(function (asset) {
                assetGraph.getAssetText(asset, this.into(asset.id));
            })
            .parEach(function (asset) {
                try {
                    vm.runInContext(this.vars[asset.id], context, asset.url || '(inline)');
                    this();
                } catch (e) {
                    this(e);
                }
            })
            .seq(function () {
                cb();
            })
            ['catch'](cb);
    };
};
