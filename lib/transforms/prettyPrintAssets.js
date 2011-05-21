var seq = require('seq');

module.exports = function (queryObj) {
    return function prettyPrintAssets(assetGraph, cb) {
        seq.ap(assetGraph.findAssets(queryObj))
            .parEach(function (asset) {
                if (asset.prettyPrint) {
                    asset.prettyPrint(this);
                    assetGraph.markAssetDirty(asset);
                } else {
                    this();
                }
            })
            .seq(function () {
                cb();
            })
            ['catch'](cb);
    };
};
