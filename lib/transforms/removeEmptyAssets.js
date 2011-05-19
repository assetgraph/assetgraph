var seq = require('seq');

module.exports = function (queryObj) {
    return function removeEmptyAssets(err, assetGraph, cb) {
        if (err) {
            throw err;
        }
        seq.ap(assetGraph.findAssets(queryObj))
            .parEach(function (asset) {
                var callback = this.into(asset.id);
                // Check if the asset has an isEmpty method:
                if (asset.isEmpty) {
                    asset.isEmpty(callback);
                } else {
                    callback(null, false); // No isEmpty method, assume it isn't empty
                }
            })
            .parEach(function (asset) {
                if (this.vars[asset.id]) {
                    assetGraph.removeAsset(asset, true); // detachIncomingRelations
                }
                this();
            })
            .seq(function () {
                cb();
            })
            ['catch'](cb);
    };
};
