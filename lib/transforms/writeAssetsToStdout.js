var seq = require('seq'),
    passError = require('../util/passError');

module.exports = function (queryObj, writeHeader) {
    return function writeAssetsToStdout(assetGraph, cb) {
        seq.ap(assetGraph.findAssets(queryObj))
            .parEach(function (asset) {
                if (asset.isText) {
                    assetGraph.getAssetText(asset, this.into(asset.id));
                } else {
                    assetGraph.getSerializedAsset(asset, this.into(asset.id));
                }
            })
            .parEach(function (asset) {
                var src = this.vars[asset.id];
                if (writeHeader) {
                    console.log("\n" + asset + ":" + "\n");
                }
                if (typeof src === 'string') {
                    console.log(src);
                } else {
                    console.log(src.toString('utf-8'));
                }
                this();
            })
            .seq(function () {
                cb();
            })
            ['catch'](cb);
    };
};
