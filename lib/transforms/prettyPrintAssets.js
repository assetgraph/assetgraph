var seq = require('seq');

module.exports = function (queryObj) {
    return function prettyPrintAssets(err, assetGraph, cb) {
        if (err) {
            throw err;
        }
        seq()
            .extend(assetGraph.findAssets(queryObj))
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
