var step = require('step');

module.exports = function (queryObj) {
    return function prettyPrintAssets(err, assetGraph, cb) {
        if (err) {
            throw err;
        }
        step(
            function () {
                assetGraph.findAssets(queryObj).forEach(function (asset) {
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
