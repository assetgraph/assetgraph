var seq = require('seq');

module.exports = function (queryObj) {
    return function minifyAssets(assetGraph, cb) {
        seq(assetGraph.findAssets(queryObj))
            .parEach(40, function (asset) {
                if (asset.minify) {
                    asset.minify(this);
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
