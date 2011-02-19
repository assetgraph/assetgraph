var step = require('step');

exports.minifyAssets = function () {
    return function minifyAssets(assetGraph, cb) {
        step(
            function () {
                assetGraph.findAssets().forEach(function (asset) {
                    if (asset.minify) {
                        asset.minify(this.parallel());
                        assetGraph.markAssetDirty(asset);
                    }
                }, this);
                process.nextTick(this.parallel());
            },
            cb
        );
    };
};
