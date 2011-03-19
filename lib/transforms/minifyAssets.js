var step = require('step');

exports.minifyAssets = function () {
    return function minifyAssets(err, assetGraph, cb) {
        if (err) {
            throw err;
        }
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
