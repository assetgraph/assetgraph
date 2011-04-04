var step = require('step');

module.exports = function (queryObj) {
    return function minifyAssets(err, assetGraph, cb) {
        if (err) {
            throw err;
        }
        step(
            function () {
                assetGraph.findAssets(queryObj).forEach(function (asset) {
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
