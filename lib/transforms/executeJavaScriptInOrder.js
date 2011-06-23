var vm = require('vm'),
    seq = require('seq');

// Only really makes sense when queryObj matches a single initial asset.
module.exports = function (queryObj, context) {
    return function executeJavaScriptInOrder(assetGraph, cb) {
        if (!context) {
            context = vm.createContext();
        }
        var assetsInOrder = [];
        assetGraph.findAssets(queryObj).forEach(function (initialAsset) {
            Array.prototype.push.apply(assetsInOrder, assetGraph.collectAssetsPostOrder(initialAsset, {to: {type: 'JavaScript'}}));
        });
        seq(assetsInOrder)
            .parEach(function (asset) {
                assetGraph.getAssetText(asset, this.into(asset.id));
            })
            .parEach(function (asset) {
                try {
                    vm.runInContext(this.vars[asset.id], context, asset.url || '(inline)');
                } catch (e) {
                    return this(e);
                }
                this();
            })
            .seq(function () {
                cb();
            })
            ['catch'](cb);
    };
};
