var seq = require('seq');

module.exports = function (queryObj) {
    return function computeSerializedSize(err, assetGraph, cb) {
        if (err) {
            throw err;
        }
        seq.ap(assetGraph.findAssets(queryObj))
            .parEach(function (asset) {
                asset.getSerializedSrc(this.into(asset.id));
            })
            .parEach(function (asset) {
                asset.serializedSize = this.vars[asset.id].length;
                this();
            })
            .seq(function () {
                cb();
            })
            ['catch'](cb);
    };
};
