var step = require('step');

exports.prettyPrintAssets = function () {
    return function prettyPrintAssets(err, assetGraph, cb) {
        if (err) {
            throw err;
        }
        step(
            function () {
                assetGraph.findAssets().forEach(function (asset) {
                    if (asset.prettyPrint) {
                        asset.prettyPrint(this.parallel());
                        assetGraph.markAssetDirty(asset);
                    }
                }, this);
                process.nextTick(this.parallel());
            },
            cb
        );
    };
};
