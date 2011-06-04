var seq = require('seq');

module.exports = function (queryObj) {
    return function computeSerializedSize(assetGraph, cb) {
        seq(assetGraph.findAssets(queryObj))
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
